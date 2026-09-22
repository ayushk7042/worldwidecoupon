import type { CsvRow } from "./csv.js";

/**
 * Column aliases.
 *
 * The WordPress export uses its own names (`Title`, `Stores`, `coupon_code`),
 * but sheets arrive from affiliate networks and hand-kept spreadsheets too.
 * Mapping the headers once here means the row normaliser keeps reading a
 * single, known set of keys.
 */
const ALIASES: Record<string, string[]> = {
  ID: ["id", "post id", "coupon id", "legacy id"],
  Title: ["title", "coupon title", "offer title", "name", "coupon name", "offer", "post title"],
  Slug: ["slug", "post name", "permalink"],
  Content: ["content", "description", "details", "post content", "coupon description"],
  Status: ["status", "post status", "state"],
  Date: ["date", "published", "post date", "created"],
  "Post Modified Date": ["post modified date", "modified", "updated"],
  // Deliberately not aliased to a bare "type": a sheet whose `type` column
  // means the offer kind would otherwise filter every row out.
  "Post Type": ["post type", "wp post type"],

  Stores: ["stores", "store", "store name", "merchant", "merchant name", "brand", "shop", "retailer"],
  Categories: ["categories", "category", "category name", "categories names"],

  coupon_code: ["coupon code", "code", "promo code", "voucher", "voucher code", "discount code"],
  coupon_affiliate: [
    "coupon affiliate",
    "affiliate",
    "affiliate url",
    "affiliate link",
    "tracking url",
    "tracking link",
  ],
  coupon_url: ["coupon url", "url", "link", "offer url", "offer link", "deal link", "destination url"],
  coupon_spec_link: ["coupon spec link", "spec link", "landing url", "landing page", "deep link"],

  "Image URL": ["image url", "image", "thumbnail", "featured image", "logo", "logo url"],
  "Image Alt Text": ["image alt text", "image alt", "alt text", "alt"],

  _yoast_wpseo_focuskw: ["focus keyword", "keyword", "focus kw"],
  "_yoast_wpseo_primary_coupon-store": ["primary store id", "store id"],
  "_yoast_wpseo_primary_coupon-category": ["primary category id", "category id"],
};

/** `Coupon_Title ` and `coupon title` are the same column to a person. */
const normalise = (header: string): string =>
  header
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");

const LOOKUP = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(ALIASES)) {
  LOOKUP.set(normalise(canonical), canonical);
  for (const alias of aliases) LOOKUP.set(normalise(alias), canonical);
}

/**
 * Renames known columns to their canonical form.
 *
 * Unknown columns are kept as they are: the export carries WordPress meta this
 * importer ignores, and dropping it would make a debugging session harder for
 * no gain. A canonical column already present is never overwritten by an
 * alias, so a sheet holding both `Title` and `coupon_title` keeps the real one.
 */
export function canonicaliseRow(row: CsvRow): CsvRow {
  const output: CsvRow = {};

  for (const [key, value] of Object.entries(row)) {
    const canonical = LOOKUP.get(normalise(key));

    if (!canonical) {
      if (!(key in output)) output[key] = value;
      continue;
    }

    const existing = output[canonical];
    const alreadyCanonical = key === canonical;

    if (existing === undefined || existing === "" || alreadyCanonical) {
      output[canonical] = value;
    }
  }

  return output;
}
