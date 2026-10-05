import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { BlogModel } from "../../models/Blog.js";
import { CategoryModel } from "../../models/Category.js";
import { ImportJobModel, type ImportIssue } from "../../models/ImportJob.js";
import { resolveTagNames } from "../coupon.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { sanitizePlain, sanitizeRich } from "../../utils/sanitize.js";
import { uniqueSlug } from "../../utils/slug.js";
import { cellText } from "./spreadsheet.js";

/**
 * Bulk blog posts — an editor fills one row per post in the downloaded
 * template and uploads it back. Every row lands in the one category chosen
 * in the admin UI before the upload; a sheet is one batch for one category,
 * the same shape the partner coupon sheet already uses.
 */

const COLUMNS = {
  title: ["title"],
  slug: ["slug"],
  excerpt: ["excerpt", "summary"],
  imageUrl: ["imageurl", "image", "featuredimage", "coverimage"],
  imageAlt: ["imagealt", "altntext", "alttext"],
  body: ["bodyhtml", "body", "content"],
  tags: ["tags"],
  authorName: ["authorname", "author"],
  status: ["status"],
  metaTitle: ["metatitle"],
  metaDescription: ["metadescription"],
} as const;

type ColumnKey = keyof typeof COLUMNS;

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

interface BlogRow {
  row: number;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string;
  imageAlt: string;
  body: string;
  tags: string;
  authorName: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
}

export interface BlogSheetResult {
  batchId: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  category: { id: string; name: string } | null;
  sample: { title: string; slug: string; status: string }[];
  issues: ImportIssue[];
  dryRun: boolean;
}

/* ------------------------------------------------------------------ */
/* Reading the workbook                                                */
/* ------------------------------------------------------------------ */

async function readRows(buffer: Buffer): Promise<BlogRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw ApiError.badRequest("That file could not be read as an Excel workbook (.xlsx)");
  }

  const sheet = workbook.worksheets.find((candidate) => candidate.rowCount > 1) ?? workbook.worksheets[0];
  if (!sheet) throw ApiError.badRequest("That workbook has no sheets");

  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: string[] = [];
    for (let column = 1; column <= Math.max(sheet.columnCount, 11); column += 1) {
      cells.push(cellText(row.getCell(column).value).trim());
    }
    grid[rowNumber] = cells;
  });

  let headerAt = -1;
  for (let index = 1; index <= Math.min(grid.length - 1, 5); index += 1) {
    const cells = grid[index];
    if (cells?.some((cell) => (COLUMNS.title as readonly string[]).includes(norm(cell)))) {
      headerAt = index;
      break;
    }
  }
  if (headerAt < 0) {
    throw ApiError.badRequest(
      "No “Title” column was found. Download the template and paste your rows into it."
    );
  }

  const header = grid[headerAt]!;
  const columns: Partial<Record<ColumnKey, number>> = {};
  for (const [field, aliases] of Object.entries(COLUMNS) as [ColumnKey, readonly string[]][]) {
    const found = header.findIndex((cell) => aliases.includes(norm(cell)));
    if (found >= 0) columns[field] = found;
  }

  const rows: BlogRow[] = [];
  for (let index = headerAt + 1; index < grid.length; index += 1) {
    const cells = grid[index];
    if (!cells || cells.every((cell) => cell === "")) continue;

    const get = (field: ColumnKey) => (columns[field] === undefined ? "" : (cells[columns[field]!] ?? ""));

    rows.push({
      row: index,
      title: get("title"),
      slug: get("slug"),
      excerpt: get("excerpt"),
      imageUrl: get("imageUrl"),
      imageAlt: get("imageAlt"),
      body: get("body"),
      tags: get("tags"),
      authorName: get("authorName"),
      status: get("status"),
      metaTitle: get("metaTitle"),
      metaDescription: get("metaDescription"),
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* The import                                                          */
/* ------------------------------------------------------------------ */

/** A sheet cell can only hold plain text — a row's body is one paragraph per
 *  line unless it already looks like HTML (an editor who knows how to write
 *  `<h2>`/`<ul>` can paste it directly and it passes through untouched). */
function bodyToHtml(text: string): string {
  if (/<\/?(p|h[1-6]|ul|ol|li|table|br|div)[\s>]/i.test(text)) return text;

  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escape(line)}</p>`)
    .join("\n");
}

export async function importBlogSheet(
  buffer: Buffer,
  options: {
    categoryId: string;
    dryRun?: boolean;
    fileName?: string;
    adminId?: string | null;
  }
): Promise<BlogSheetResult> {
  const category = await CategoryModel.findById(options.categoryId).select("name");
  if (!category) throw ApiError.badRequest("Choose a category for these posts first");

  const rows = await readRows(buffer);
  if (!rows.length) throw ApiError.badRequest("The sheet has a header but no post rows");

  const batchId = `blog-${randomUUID().slice(0, 8)}`;
  const issues: ImportIssue[] = [];
  const sample: BlogSheetResult["sample"] = [];
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
        source: "blog-sheet",
        mode: "create",
        status: "importing",
        totalRows: rows.length,
        startedAt: new Date(),
        createdByAdmin: options.adminId ?? null,
      });

  const seenTitles = new Set<string>();

  for (const row of rows) {
    const skip = (field: string, message: string, value?: string) => {
      skipped += 1;
      issues.push({ row: row.row, field, message, value });
    };

    if (!row.title) {
      skip("Title", "Missing title");
      continue;
    }
    if (!row.body) {
      skip("Body HTML", "Missing body — every post needs some content");
      continue;
    }
    const titleKey = row.title.trim().toLowerCase();
    if (seenTitles.has(titleKey)) {
      skip("Title", "Listed twice in this sheet", row.title);
      continue;
    }
    seenTitles.add(titleKey);

    const status = row.status.trim().toLowerCase();
    const resolvedStatus = status === "published" || status === "draft" || status === "archived" ? status : "draft";
    if (row.status && resolvedStatus !== status) {
      issues.push({
        row: row.row,
        field: "Status",
        message: `“${row.status}” is not draft, published or archived — saved as draft`,
        value: row.status,
      });
    }

    const tagNames = row.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const title = sanitizePlain(row.title);
    const body = sanitizeRich(bodyToHtml(row.body));

    // The raw title, not the sanitised one — sanitizing HTML-encodes
    // "&" into "&amp;" (correct for the stored value, which a renderer
    // treats as HTML), but this sample is plain preview text, where that
    // would show as a literal "&amp;" instead of "&".
    sample.push({ title: row.title.trim(), slug: row.slug || "", status: resolvedStatus });

    if (options.dryRun) {
      created += 1;
      continue;
    }

    const tags = await resolveTagNames(tagNames);
    const slug = await uniqueSlug(BlogModel, row.slug || row.title);

    const doc = await BlogModel.create({
      title,
      slug,
      excerpt: row.excerpt ? sanitizePlain(row.excerpt) : undefined,
      body,
      image: row.imageUrl ? { url: row.imageUrl, alt: row.imageAlt || undefined } : null,
      categories: [category._id],
      tagNames,
      tags,
      authorName: row.authorName ? sanitizePlain(row.authorName) : undefined,
      status: resolvedStatus,
      metaTitle: row.metaTitle || undefined,
      metaDescription: row.metaDescription || undefined,
    });

    sample[sample.length - 1]!.slug = doc.slug;
    createdIds.push(doc._id);
    created += 1;
  }

  if (!options.dryRun) {
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
          createdBlogIds: createdIds,
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
    category: { id: String(category._id), name: category.name },
    sample: sample.slice(0, 50),
    issues,
    dryRun: Boolean(options.dryRun),
  };
}

/* ------------------------------------------------------------------ */
/* The downloadable template                                           */
/* ------------------------------------------------------------------ */

export async function buildBlogTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Blog posts");

  const headers = [
    "Title",
    "Slug",
    "Excerpt",
    "Image URL",
    "Image Alt",
    "Body HTML",
    "Tags",
    "Author Name",
    "Status",
    "Meta Title",
    "Meta Description",
  ];

  sheet.addRow(["Blog posts — fill one row per post. Pick the category in the import screen, not here."]);
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
    [
      "10 Best Travel Hacks to Save Big on Flights, Hotels & More",
      "",
      "From flight discounts to hotel deals, here are 10 proven travel hacks to help you save more on your next trip.",
      "https://example.com/images/travel-hacks.jpg",
      "Traveller looking out of a plane window",
      "<h2>Book in the right window</h2><p>Fares move the most in the six weeks before a flight — set an alert instead of guessing.</p><ul><li>Tuesday afternoons see the most price drops</li><li>One-way fares are rarely cheaper split across two bookings</li></ul>",
      "travel, flights, hotels",
      "WorldwideCoupons Team",
      "draft",
      "",
      "",
    ],
    [
      "Best Time to Buy Electronics — Sales, Deals & More",
      "",
      "Find out the best times to buy electronics, top brands to watch and how to get the biggest discounts.",
      "https://example.com/images/electronics.jpg",
      "Laptop, headphones and a smartwatch on a desk",
      "Most electronics bottom out in price around Black Friday and back-to-school season.\nLaptops are the exception — refresh cycles in spring often beat the November price.",
      "electronics, deals",
      "WorldwideCoupons Team",
      "draft",
      "",
      "",
    ],
  ];
  example.forEach((row) => sheet.addRow(row));

  [40, 16, 46, 32, 30, 60, 22, 20, 12, 28, 34].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.views = [{ state: "frozen", ySplit: 2 }];

  const help = workbook.addWorksheet("How to fill");
  [
    ["Column", "What to put there"],
    ["Title", "Required. The post's headline."],
    ["Slug", "Optional. Leave blank to generate one from the title."],
    ["Excerpt", "Optional, up to 400 characters. Shown on listing cards; a summary works well."],
    ["Image URL", "Optional. A direct link to the cover image (must start with http/https)."],
    ["Image Alt", "Optional. Alt text for the cover image."],
    [
      "Body HTML",
      "Required. Either plain lines of text (each blank-line-separated paragraph becomes its own <p>), " +
        "or real HTML if you want headings, bullet points or a table — e.g. <h2>, <p>, <ul><li>, <table><tr><td>.",
    ],
    ["Tags", "Optional. Comma-separated, e.g. “travel, flights, hotels”."],
    ["Author Name", "Optional. Defaults to your admin name if left blank."],
    ["Status", "Optional. draft, published or archived — defaults to draft so nothing goes live by accident."],
    ["Meta Title", "Optional. SEO title; defaults to the post title if left blank."],
    ["Meta Description", "Optional. SEO description."],
    ["Category", "Not a column here — you choose one category for the whole sheet on the import screen."],
  ].forEach((row, index) => {
    const added = help.addRow(row);
    if (index === 0) added.font = { bold: true };
  });
  help.getColumn(1).width = 20;
  help.getColumn(2).width = 110;

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
