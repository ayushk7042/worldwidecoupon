import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { CategoryModel } from "../../models/Category.js";
import { CouponModel } from "../../models/Coupon.js";
import { ImportJobModel, type ImportIssue } from "../../models/ImportJob.js";
import { StoreModel, type StoreDocument } from "../../models/Store.js";
import { ApiError } from "../../utils/ApiError.js";
import { slugify } from "../../utils/text.js";
import { uniqueSlug } from "../../utils/slug.js";
import { refreshCategoryCounts, refreshManyStoreCounts } from "../counters.service.js";
import { cellText } from "./spreadsheet.js";

/**
 * Partner coupon sheets — the "Dept. / COUPON CODE / Device / Discount /
 * Description / Landing page / Valid Date / Discount rate / Code quantity"
 * files an affiliate network mails out each month.
 *
 * One row is one coupon *code*. The sheet's landing page is deliberately
 * ignored: every offer is sent to the store's own affiliate link, so the
 * tracking that is already set up keeps working.
 */

const COLUMN_ALIASES: Record<string, string[]> = {
  department: ["dept", "department"],
  code: ["couponcode", "code", "promocode"],
  device: ["device", "audience"],
  discount: ["discount", "offer"],
  description: ["description", "details"],
  landing: ["landingpage", "landing", "link", "url"],
  valid: ["validdate", "valid", "validity", "validuntil", "validto"],
  rate: ["discountrate", "rate"],
  quantity: ["codequantity", "quantity", "qty"],
};

/** A hyperlinked cell shows its label, not its target — the label is the text a person wrote. */
function cellLabel(value: ExcelJS.CellValue): string {
  if (value && typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text;
  }
  return cellText(value);
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface PartnerRow {
  row: number;
  code: string;
  device: string;
  department: string;
  discountText: string;
  description: string;
  validText: string;
  rate: number | null;
  quantity: number | null;
}

export interface PartnerSheetResult {
  batchId: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  store: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string } | null;
  sample: { code: string; title: string; discount: string; validFrom: string | null; validTo: string | null; audience: string }[];
  issues: ImportIssue[];
  dryRun: boolean;
}

/* ------------------------------------------------------------------ */
/* Reading the workbook                                                */
/* ------------------------------------------------------------------ */

async function readRows(buffer: Buffer): Promise<{ rows: PartnerRow[]; tzOffsetHours: number }> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw ApiError.badRequest("That file could not be read as an Excel workbook (.xlsx)");
  }

  for (const sheet of workbook.worksheets) {
    const grid: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = [];
      for (let column = 1; column <= Math.max(sheet.columnCount, 9); column += 1) {
        cells.push(cellLabel(row.getCell(column).value).trim());
      }
      grid[rowNumber] = cells;
    });

    // The header is the first row (within the top ten) that names a code column.
    let headerAt = -1;
    for (let index = 1; index <= Math.min(grid.length - 1, 10); index += 1) {
      const cells = grid[index];
      if (cells?.some((cell) => COLUMN_ALIASES.code!.includes(norm(cell)))) {
        headerAt = index;
        break;
      }
    }
    if (headerAt < 0) continue;

    const header = grid[headerAt]!;
    const columns: Record<string, number> = {};
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      const found = header.findIndex((cell) => {
        const key = norm(cell);
        return aliases.some((alias) => key === alias || (field === "valid" && key.startsWith("valid")));
      });
      if (found >= 0) columns[field] = found;
    }

    if (columns.code === undefined || columns.discount === undefined) {
      throw ApiError.badRequest(
        "The sheet needs at least a “COUPON CODE” and a “Discount” column. Download the template for the exact layout."
      );
    }

    const tz = /utc\s*([+-]\d{1,2})/i.exec(header[columns.valid ?? -1] ?? "");
    const tzOffsetHours = tz ? Number(tz[1]) : 0;

    const rows: PartnerRow[] = [];
    let department = "";

    for (let index = headerAt + 1; index < grid.length; index += 1) {
      const cells = grid[index];
      if (!cells || cells.every((cell) => cell === "")) continue;

      const get = (field: string) => (columns[field] === undefined ? "" : (cells[columns[field]!] ?? ""));

      // "Dept." is only filled on the first row of each group.
      if (get("department")) department = get("department");

      const number = (value: string) => {
        const parsed = Number(value.replace(/[, %]/g, ""));
        return value && Number.isFinite(parsed) ? parsed : null;
      };

      rows.push({
        row: index,
        code: get("code").replace(/\s+/g, "").toUpperCase(),
        device: get("device") || "All",
        department,
        discountText: get("discount"),
        description: get("description"),
        validText: get("valid"),
        rate: number(get("rate")),
        quantity: number(get("quantity")),
      });
    }

    return { rows, tzOffsetHours };
  }

  throw ApiError.badRequest(
    "No “COUPON CODE” column was found. Download the template and paste your rows into it."
  );
}

/* ------------------------------------------------------------------ */
/* Cell parsers                                                        */
/* ------------------------------------------------------------------ */

const CURRENCY: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "₹": "INR" };

/** "$29-$3" → spend $29, save $3.  "10%" / "10% off" → a percentage. */
export function parseDiscount(text: string): {
  type: "fixed" | "percent";
  value: number;
  minimumSpend?: number;
  currency: string;
  label: string;
} | null {
  const clean = text.replace(/\s+/g, "");

  const spend = /^([$€£₹]?)(\d+(?:\.\d+)?)[-–—]([$€£₹]?)(\d+(?:\.\d+)?)$/.exec(clean);
  if (spend) {
    const symbol = spend[1] || spend[3] || "$";
    return {
      type: "fixed",
      minimumSpend: Number(spend[2]),
      value: Number(spend[4]),
      currency: CURRENCY[symbol] ?? "USD",
      label: text.trim(),
    };
  }

  const percent = /^(\d+(?:\.\d+)?)%/.exec(clean);
  if (percent) return { type: "percent", value: Number(percent[1]), currency: "USD", label: text.trim() };

  const flat = /^([$€£₹])(\d+(?:\.\d+)?)/.exec(clean);
  if (flat) return { type: "fixed", value: Number(flat[2]), currency: CURRENCY[flat[1]!] ?? "USD", label: text.trim() };

  return null;
}

/** "2026-10-01 00:00:00 to 2026-10-31 23:59:59" (in the sheet's time zone) → UTC dates. */
export function parseValidity(text: string, tzOffsetHours: number): { from: Date | null; to: Date | null } {
  const stamps = text.match(/\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/g) ?? [];

  const toDate = (stamp: string | undefined, endOfDay: boolean) => {
    if (!stamp) return null;
    const [day, time] = stamp.split(/[ T]/);
    const [y, m, d] = day!.split("-").map(Number) as [number, number, number];
    const [hh, mm, ss] = time ? time.split(":").map(Number) : endOfDay ? [23, 59, 59] : [0, 0, 0];
    const utc = Date.UTC(y, m - 1, d, hh ?? 0, mm ?? 0, ss ?? 0) - tzOffsetHours * 3_600_000;
    const date = new Date(utc);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  if (stamps.length >= 2) return { from: toDate(stamps[0], false), to: toDate(stamps[1], true) };
  if (stamps.length === 1) return { from: null, to: toDate(stamps[0], true) };
  return { from: null, to: null };
}

const niceDomain = (domain: string) => {
  const clean = domain.replace(/^www\./, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const money = (value: number, currency: string) => {
  const symbol = Object.entries(CURRENCY).find(([, code]) => code === currency)?.[0] ?? "$";
  return `${symbol}${Number.isInteger(value) ? value : value.toFixed(2)}`;
};

const shortDate = (date: Date, tzOffsetHours: number) =>
  new Date(date.getTime() + tzOffsetHours * 3_600_000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/* ------------------------------------------------------------------ */
/* The import                                                          */
/* ------------------------------------------------------------------ */

async function resolveStore(rows: PartnerRow[], buffer: Buffer, storeId?: string | null): Promise<StoreDocument | null> {
  if (storeId) return StoreModel.findById(storeId);

  // No store chosen: work it out from the sheet's landing-page links.
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  for (const sheet of workbook.worksheets) {
    for (const row of sheet.getSheetValues() as unknown[][]) {
      for (const value of row ?? []) {
        const text = cellText(value as ExcelJS.CellValue);
        const host = /https?:\/\/([^/\s]+)/i.exec(text)?.[1]?.toLowerCase().replace(/^www\./, "");
        if (host) {
          const store = await StoreModel.findOne({ domain: host });
          if (store) return store;
        }
      }
    }
  }
  void rows;
  return null;
}

export async function importPartnerSheet(
  buffer: Buffer,
  options: {
    categoryId: string;
    storeId?: string | null;
    dryRun?: boolean;
    fileName?: string;
    adminId?: string | null;
  }
): Promise<PartnerSheetResult> {
  const category = await CategoryModel.findById(options.categoryId).select("name");
  if (!category) throw ApiError.badRequest("Choose a category for these coupons first");

  const { rows, tzOffsetHours } = await readRows(buffer);
  if (!rows.length) throw ApiError.badRequest("The sheet has a header but no coupon rows");

  const store = await resolveStore(rows, buffer, options.storeId);
  if (!store) {
    throw ApiError.badRequest(
      "Could not tell which store this sheet is for — pick the store, or make sure its landing-page links point at a store already on the site"
    );
  }

  const link = store.affiliateUrl || store.websiteUrl || (store.domain ? `https://${store.domain}/` : undefined);
  const brand = niceDomain(store.domain || store.name);
  const batchId = `partner-${randomUUID().slice(0, 8)}`;

  const issues: ImportIssue[] = [];
  const sample: PartnerSheetResult["sample"] = [];
  const createdIds: unknown[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const job = options.dryRun
    ? null
    : await ImportJobModel.create({
        batchId,
        fileName: options.fileName,
        fileType: "xlsx",
        source: "partner-sheet",
        mode: "upsert",
        status: "importing",
        totalRows: rows.length,
        startedAt: new Date(),
        createdByAdmin: options.adminId ?? null,
      });

  const seen = new Set<string>();

  for (const row of rows) {
    const skip = (field: string, message: string, value?: string) => {
      skipped += 1;
      issues.push({ row: row.row, field, message, value });
    };

    if (!row.code) {
      skip("COUPON CODE", "Missing coupon code");
      continue;
    }
    if (seen.has(row.code)) {
      skip("COUPON CODE", "Listed twice in this sheet", row.code);
      continue;
    }
    seen.add(row.code);

    const discount = parseDiscount(row.discountText);
    if (!discount) {
      skip("Discount", "Could not read this discount — use “$29-$3” (spend $29, save $3) or “10%”", row.discountText);
      continue;
    }

    const { from, to } = parseValidity(row.validText, tzOffsetHours);
    if (row.validText && !to) {
      issues.push({ row: row.row, field: "Valid Date", message: "Could not read the dates — the code is listed without an expiry", value: row.validText });
    }

    const newBuyer = /new/i.test(row.device);
    const offerText =
      discount.type === "fixed" && discount.minimumSpend
        ? `${money(discount.minimumSpend, discount.currency)}-${money(discount.value, discount.currency)}`
        : discount.label;
    const title = `${newBuyer ? "New user: " : ""}Enjoy ${offerText} With Coupon "${row.code}" at ${brand}`.replace(/\s+/g, " ");

    const lines = [
      row.description || `Save ${discount.type === "fixed" ? money(discount.value, discount.currency) : `${discount.value}%`} at ${brand} with coupon ${row.code}.`,
      discount.type === "fixed" && discount.minimumSpend
        ? `Spend ${money(discount.minimumSpend, discount.currency)} or more, save ${money(discount.value, discount.currency)}.`
        : null,
      newBuyer ? "For new buyers only." : row.device && !/^all$/i.test(row.device) ? `For: ${row.device}.` : null,
      from && to ? `Valid ${shortDate(from, tzOffsetHours)} – ${shortDate(to, tzOffsetHours)}.` : to ? `Valid until ${shortDate(to, tzOffsetHours)}.` : null,
      row.quantity ? `Limited to ${row.quantity.toLocaleString("en-US")} redemptions.` : null,
    ].filter(Boolean) as string[];

    const expired = Boolean(to && to.getTime() < Date.now());

    const fields = {
      title,
      description: lines.join("\n"),
      type: "code" as const,
      code: row.code,
      discountType: discount.type,
      discountValue: discount.value,
      currency: discount.currency,
      minimumSpend: discount.minimumSpend,
      store: store._id,
      categories: [category._id],
      country: store.country || "US",
      destinationUrl: link,
      startsAt: from,
      expiresAt: to,
      neverExpires: !to,
      verified: true,
      verifiedAt: new Date(),
      lastCheckedAt: new Date(),
      status: expired ? ("expired" as const) : ("active" as const),
      tagNames: newBuyer ? ["new-buyer"] : [],
      device: row.device,
      department: row.department || undefined,
      codeQuantity: row.quantity ?? undefined,
      discountRate: row.rate ?? undefined,
      source: "partner-sheet",
    };

    sample.push({
      code: row.code,
      title,
      discount: discount.label,
      validFrom: from?.toISOString() ?? null,
      validTo: to?.toISOString() ?? null,
      audience: row.device,
    });

    if (options.dryRun) {
      const exists = await CouponModel.exists({ store: store._id, code: row.code });
      if (exists) updated += 1;
      else created += 1;
      continue;
    }

    const existing = await CouponModel.findOne({ store: store._id, code: row.code }).select("_id categories");
    if (existing) {
      // A code already on the site keeps its stats and any categories an
      // editor added; the sheet's own facts win.
      const merged = [...new Set([...(existing.categories ?? []).map(String), String(category._id)])];
      await CouponModel.updateOne({ _id: existing._id }, { $set: { ...fields, categories: merged } });
      updated += 1;
    } else {
      const slug = await uniqueSlug(CouponModel, slugify(title));
      const doc = await CouponModel.create({ ...fields, slug });
      createdIds.push(doc._id);
      created += 1;
    }
  }

  if (!options.dryRun) {
    await refreshManyStoreCounts([String(store._id)]);
    await refreshCategoryCounts();

    await ImportJobModel.updateOne(
      { _id: job?._id },
      {
        $set: {
          status: "completed",
          createdCount: created,
          updatedCount: updated,
          skippedCount: skipped,
          errorCount: issues.length,
          issues: issues.slice(0, 500),
          createdCouponIds: createdIds,
          finishedAt: new Date(),
        },
      }
    );
  }

  return {
    batchId,
    totalRows: rows.length,
    created,
    updated,
    skipped,
    store: { id: String(store._id), name: store.name, slug: store.slug },
    category: { id: String(category._id), name: category.name },
    sample: sample.slice(0, 50),
    issues,
    dryRun: Boolean(options.dryRun),
  };
}

/* ------------------------------------------------------------------ */
/* The downloadable template                                           */
/* ------------------------------------------------------------------ */

export async function buildPartnerTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Coupons");

  const headers = [
    "Dept.",
    "COUPON CODE",
    "Device",
    "Discount",
    "Description",
    "Landing page",
    "Valid Date(UTC+8)",
    "Discount rate",
    "Code quantity",
  ];

  sheet.addRow(["Partner coupons — fill one row per code, keep the header row exactly as it is."]);
  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.getRow(1).font = { italic: true, color: { argb: "FF64748B" } };

  const head = sheet.addRow(headers);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F9059" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  head.height = 24;

  const example = [
    ["C", "EXAMPLE2026SAVE3", "All", "$29-$3", "Save $3 on orders over $29 using coupon EXAMPLE2026SAVE3.", "https://www.example.com/", "2026-10-01 00:00:00 to 2026-10-31 23:59:59", 0.1, 10000],
    [null, "EXAMPLE2026SAVE5", "All", "$50-$5", "Save $5 on orders over $50 using coupon EXAMPLE2026SAVE5.", "https://www.example.com/", "2026-10-01 00:00:00 to 2026-10-31 23:59:59", 0.1, 10000],
    ["New Buyer", "EXAMPLE2026NEW3", "New buyer", "$5-$3", "New user: Save $3 on orders over $5 using coupon EXAMPLE2026NEW3.", "https://www.example.com/", "2026-10-01 00:00:00 to 2026-10-31 23:59:59", 0.6, 5000],
  ];
  example.forEach((row) => sheet.addRow(row));

  [10, 24, 12, 14, 56, 30, 44, 15, 15].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.views = [{ state: "frozen", ySplit: 2 }];

  const help = workbook.addWorksheet("How to fill");
  [
    ["Column", "What to put there"],
    ["Dept.", "Optional. Your own grouping — only needed on the first row of a group."],
    ["COUPON CODE", "Required. The code shoppers copy. Each code appears once."],
    ["Device", "Who it is for: All, New buyer, App… Anything containing “new” is shown as a new-buyer code."],
    ["Discount", "Required. “$29-$3” means spend $29, save $3. “10%” or “$5” also work."],
    ["Description", "One line shown on the offer. Leave blank to have one written for you."],
    ["Landing page", "Ignored — every offer goes to the store’s own affiliate link. Used only to work out which store the sheet is for."],
    ["Valid Date(UTC+8)", "“2026-10-01 00:00:00 to 2026-10-31 23:59:59”. The time zone in the header is honoured."],
    ["Discount rate", "Optional. Saved with the code."],
    ["Code quantity", "Optional. How many times the code can be used; shown on the offer."],
  ].forEach((row, index) => {
    const added = help.addRow(row);
    if (index === 0) added.font = { bold: true };
  });
  help.getColumn(1).width = 22;
  help.getColumn(2).width = 110;

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
