import { randomUUID } from "node:crypto";
import { CategoryModel } from "../../models/Category.js";
import { CouponModel } from "../../models/Coupon.js";
import { ImportJobModel, type ImportIssue } from "../../models/ImportJob.js";
import { StoreModel } from "../../models/Store.js";
import { slugify, titleCase } from "../../utils/text.js";
import { logoForDomain } from "../../utils/url.js";
import { uniqueSlugInSet } from "../../utils/slug.js";
import { refreshCategoryCounts, refreshManyStoreCounts } from "../counters.service.js";
import { parseCsv } from "./csv.js";
import { canonicaliseRow } from "./headers.js";
import { normaliseWordpressRow, type NormalisedRow } from "./wordpressRow.js";

export interface ImportOptions {
  /** `replace` wipes coupons, stores and categories first. */
  mode: "upsert" | "replace";
  fileName?: string;
  /** Recorded on the job so the history shows what was uploaded. */
  fileType?: "csv" | "xlsx";
  adminId?: string | null;
  /** Parse and report without writing — used by the "preview" step. */
  dryRun?: boolean;
  onProgress?: (done: number, total: number) => void;
}

export interface ImportResult {
  batchId: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  storesCreated: number;
  categoriesCreated: number;
  issues: ImportIssue[];
  durationMs: number;
}

/**
 * The WordPress export has no category descriptions, so these fill the gap.
 * Names are matched loosely — the export contains `Jewlery` (sic) and
 * `Home &amp; Garden`, and both should land on a sensible page.
 */
const CATEGORY_META: Record<string, { icon: string; description: string }> = {
  accessories: { icon: "🎒", description: "Bags, watches, belts and everyday extras." },
  "fashion-accessories": { icon: "👜", description: "Jewellery, scarves, sunglasses and finishing touches." },
  clothing: { icon: "👕", description: "Everyday clothing for women, men and kids." },
  "mens-clothing": { icon: "🧥", description: "Shirts, suits, denim and outerwear for men." },
  electronics: { icon: "🔌", description: "Phones, laptops, audio and smart-home gear." },
  food: { icon: "🍔", description: "Groceries, meal kits, takeaway and treats." },
  nutrition: { icon: "🥗", description: "Supplements, protein and healthy eating." },
  travel: { icon: "✈️", description: "Flights, hotels, car hire and holiday packages." },
  "school-stuff": { icon: "🎓", description: "Courses, textbooks and study tools." },
  beauty: { icon: "💄", description: "Skincare, haircare and beauty routines." },
  "makeup-products": { icon: "💋", description: "Foundation, palettes, brushes and cosmetics." },
  movies: { icon: "🎬", description: "Streaming, cinema tickets and home entertainment." },
  music: { icon: "🎧", description: "Gigs, streaming and music gear." },
  furniture: { icon: "🛋️", description: "Sofas, beds, desks and storage." },
  "furniture-and-decor": { icon: "🪑", description: "Furniture and finishing touches for every room." },
  "home-and-garden": { icon: "🏡", description: "Everything for the house and the garden." },
  "home-appliances": { icon: "🧺", description: "Washers, fridges, ovens and small appliances." },
  "gardening-supplies": { icon: "🌱", description: "Plants, seeds, flowers and garden tools." },
  jewlery: { icon: "💍", description: "Rings, necklaces, earrings and fine jewellery." },
  jewellery: { icon: "💍", description: "Rings, necklaces, earrings and fine jewellery." },
  "arts-and-crafts": { icon: "🎨", description: "Craft kits, art supplies and making things." },
  "cds-books-and-magazine": { icon: "📚", description: "Books, magazines, software and subscriptions." },
  collectibles: { icon: "🕹️", description: "Games, figures and things worth keeping." },
  sporting: { icon: "🏀", description: "Sports kit, tickets and team gear." },
  fitness: { icon: "🏋️", description: "Gym gear, activewear and training plans." },
  medical: { icon: "⚕️", description: "Health, wellbeing and pharmacy." },
  "automobile-parts": { icon: "🚗", description: "Tyres, parts and car care." },
  "free-shipping": { icon: "📦", description: "Offers where delivery costs nothing." },
  "gift-cards": { icon: "🎁", description: "Gift cards and vouchers." },
  "black-friday": { icon: "🛍️", description: "The year's biggest discounts." },
};

/* =========================================================
   LOOKUP CACHES

   A 1,700-row import touches the same 196 stores and 29 categories over and
   over. Caching by slug turns tens of thousands of round trips into a few
   hundred, which is the difference between seconds and minutes.
========================================================= */

class Registry {
  readonly categories = new Map<string, string>();
  readonly stores = new Map<string, string>();
  readonly couponSlugs = new Set<string>();

  /**
   * Categories seen per store, accumulated in memory.
   *
   * A store's coupons are spread across the file, so the full category set is
   * only known once every row has been read. Writing it per row cost one
   * round trip per coupon; flushing once at the end costs one per store.
   */
  readonly storeCategories = new Map<string, Set<string>>();

  categoriesCreated = 0;
  storesCreated = 0;

  readonly createdCategoryIds: string[] = [];
  readonly createdStoreIds: string[] = [];

  noteCategories(storeId: string, categoryIds: string[]): void {
    if (!categoryIds.length) return;
    const set = this.storeCategories.get(storeId) ?? new Set<string>();
    categoryIds.forEach((id) => set.add(id));
    this.storeCategories.set(storeId, set);
  }
}

async function ensureCategory(name: string, registry: Registry): Promise<string | null> {
  const slug = slugify(name);
  if (!slug) return null;

  const cached = registry.categories.get(slug);
  if (cached) return cached;

  const existing = await CategoryModel.findOne({ slug }).select("_id").lean();
  if (existing) {
    registry.categories.set(slug, String(existing._id));
    return String(existing._id);
  }

  const meta = CATEGORY_META[slug];

  const category = await CategoryModel.create({
    name: titleCase(name),
    slug,
    icon: meta?.icon,
    description: meta?.description,
    status: "active",
    showOnHome: true,
    showInMenu: true,
  });

  registry.categories.set(slug, String(category._id));
  registry.createdCategoryIds.push(String(category._id));
  registry.categoriesCreated += 1;

  return String(category._id);
}

async function ensureStore(
  row: NormalisedRow,
  categoryIds: string[],
  registry: Registry
): Promise<string | null> {
  const slug = slugify(row.storeName);
  if (!slug) return null;

  const cached = registry.stores.get(slug);
  if (cached) {
    registry.noteCategories(cached, categoryIds);
    return cached;
  }

  const existing = await StoreModel.findOne({ slug }).select("_id").lean();

  if (existing) {
    const id = String(existing._id);
    registry.stores.set(slug, id);
    registry.noteCategories(id, categoryIds);

    await StoreModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...(row.websiteUrl ? { websiteUrl: row.websiteUrl } : {}),
          ...(row.domain ? { domain: row.domain } : {}),
        },
      }
    );

    return id;
  }

  const name = titleCase(row.storeName);

  const store = await StoreModel.create({
    name,
    slug,
    websiteUrl: row.websiteUrl,
    affiliateUrl: row.destinationUrl,
    domain: row.domain,
    // Brand artwork is not in the export; a domain-derived logo is better
    // than an empty tile and is replaced the moment an editor uploads one.
    logo: row.domain ? { url: logoForDomain(row.domain), alt: `${name} logo` } : null,
    categories: categoryIds,
    primaryCategory: categoryIds[0] ?? null,
    legacyTermId: row.storeLegacyId,
    status: "active",
    description: `Browse every live ${name} coupon code and deal, checked before it goes on the page.`,
    howToRedeem: [
      `Pick the ${name} offer you want and click through.`,
      "Copy the code if there is one — deals apply automatically.",
      `Shop as normal on ${name}.`,
      "Paste the code at checkout and watch the total drop.",
    ],
  });

  const id = String(store._id);

  registry.stores.set(slug, id);
  registry.noteCategories(id, categoryIds);
  registry.createdStoreIds.push(id);
  registry.storesCreated += 1;

  return id;
}

/** Writes the accumulated per-store category sets in one pass. */
async function flushStoreCategories(registry: Registry): Promise<void> {
  const operations = [...registry.storeCategories].map(([storeId, categoryIds]) => ({
    updateOne: {
      filter: { _id: storeId },
      update: {
        $addToSet: { categories: { $each: [...categoryIds] } },
        $set: { primaryCategory: [...categoryIds][0] ?? null },
      },
    },
  }));

  if (operations.length) await StoreModel.bulkWrite(operations as never);
}

/* =========================================================
   THE IMPORT
========================================================= */

export async function importWordpressCsv(
  csvText: string,
  options: ImportOptions
): Promise<ImportResult> {
  const startedAt = Date.now();
  const batchId = randomUUID();

  const rows = parseCsv(csvText)
    .map(canonicaliseRow)
    .filter((row) => {
      const postType = (row["Post Type"] ?? "").trim().toLowerCase();
      // The export can include pages and attachments; only coupons are wanted.
      return !postType || postType === "coupon";
    });

  const registry = new Registry();
  const issues: ImportIssue[] = [];
  /** Kept so a bad import can be undone without touching anything else. */
  const createdCouponIds: string[] = [];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  const job = options.dryRun
    ? null
    : await ImportJobModel.create({
        batchId,
        fileName: options.fileName,
        fileType: options.fileType ?? "csv",
        source: "wordpress",
        mode: options.mode,
        status: "importing",
        totalRows: rows.length,
        startedAt: new Date(),
        createdByAdmin: options.adminId ?? null,
      });

  if (options.mode === "replace" && !options.dryRun) {
    // Deliberately destructive and only reachable from an explicit flag.
    await Promise.all([
      CouponModel.deleteMany({}),
      StoreModel.deleteMany({}),
      CategoryModel.deleteMany({}),
    ]);
  }

  // A fresh set for `replace`; seeded from the database otherwise, so an
  // upsert does not collide with slugs it did not create.
  if (options.mode !== "replace" && !options.dryRun) {
    const existing = await CouponModel.find().select("slug").lean();
    existing.forEach((coupon) => registry.couponSlugs.add(coupon.slug));
  }

  const touchedStores = new Set<string>();

  for (const [index, raw] of rows.entries()) {
    const rowNumber = index + 2; // +1 for the header, +1 for 1-based counting

    try {
      const row = normaliseWordpressRow(raw);

      if (!row) {
        skipped += 1;
        issues.push({ row: rowNumber, message: "Skipped: no title" });
        continue;
      }

      for (const issue of row.issues) {
        issues.push({ row: rowNumber, message: issue, value: row.title.slice(0, 80) });
      }

      if (!row.storeName) {
        skipped += 1;
        continue;
      }

      if (options.dryRun) {
        created += 1;
        continue;
      }

      const categoryIds = (
        await Promise.all(
          row.categoryNames.map((name) => ensureCategory(name, registry))
        )
      ).filter((id): id is string => id !== null);

      const storeId = await ensureStore(row, categoryIds, registry);
      if (!storeId) {
        skipped += 1;
        issues.push({ row: rowNumber, field: "Stores", message: "Could not resolve a store" });
        continue;
      }

      touchedStores.add(storeId);

      const payload = {
        title: row.title,
        description: row.description,
        type: row.type,
        code: row.code,
        discountType: row.discountType,
        discountValue: row.discountValue,
        store: storeId,
        categories: categoryIds,
        destinationUrl: row.destinationUrl,
        landingUrl: row.landingUrl,
        // Nothing in the export carries an end date, and guessing one would
        // silently expire live offers. Editors set real dates from the panel.
        neverExpires: true,
        expiresAt: null,
        status: row.status,
        verified: row.status === "active",
        verifiedAt: row.status === "active" ? row.modifiedAt ?? new Date() : null,
        image: row.imageUrl ? { url: row.imageUrl, alt: row.imageAlt } : null,
        focusKeyword: row.focusKeyword,
        legacyId: row.legacyId || undefined,
        source: "wordpress-import",
        createdAt: row.publishedAt ?? undefined,
      };

      const existing = row.legacyId
        ? await CouponModel.findOne({ legacyId: row.legacyId }).select("_id").lean()
        : null;

      if (existing && options.mode === "upsert") {
        await CouponModel.updateOne({ _id: existing._id }, { $set: payload });
        updated += 1;
      } else {
        const slug = uniqueSlugInSet(row.slug || row.title, registry.couponSlugs);
        const coupon = await CouponModel.create({ ...payload, slug });
        createdCouponIds.push(String(coupon._id));

        // `createdAt` is set by timestamps on insert, so the original publish
        // date has to be written back for "newest first" to mean anything.
        if (row.publishedAt) {
          await CouponModel.updateOne(
            { _id: coupon._id },
            { $set: { createdAt: row.publishedAt } },
            { timestamps: false }
          );
        }

        created += 1;
      }
    } catch (error) {
      skipped += 1;
      issues.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Unknown error",
        value: String(raw.Title ?? "").slice(0, 80),
      });
    }

    options.onProgress?.(index + 1, rows.length);
  }

  if (!options.dryRun) {
    await flushStoreCategories(registry);
    await refreshManyStoreCounts([...touchedStores]);
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
          storesCreated: registry.storesCreated,
          categoriesCreated: registry.categoriesCreated,
          // Capping keeps a 1,700-row report from bloating the document past
          // Mongo's 16 MB limit; the counts above stay exact.
          issues: issues.slice(0, 500),
          createdCouponIds,
          createdStoreIds: registry.createdStoreIds,
          createdCategoryIds: registry.createdCategoryIds,
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
    storesCreated: registry.storesCreated,
    categoriesCreated: registry.categoriesCreated,
    issues,
    durationMs: Date.now() - startedAt,
  };
}
