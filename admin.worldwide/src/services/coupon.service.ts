import type { FilterQuery } from "mongoose";
import { CategoryModel } from "../models/Category.js";
import { CODE_BEARING_TYPES, type Coupon } from "../models/Coupon.js";
import { normalizeImage } from "../models/shared/image.schema.js";
import { StoreModel } from "../models/Store.js";
import { TagModel } from "../models/Tag.js";
import { isObjectId } from "../utils/objectId.js";
import { sanitizeMultiline, sanitizePlain, sanitizeRich } from "../utils/sanitize.js";
import { slugify } from "../utils/text.js";
import { normalizeUrl } from "../utils/url.js";
import type {
  CouponSort,
  CreateCouponBody,
  ListCouponsQuery,
  UpdateCouponBody,
} from "../validators/coupon.validator.js";
import { liveCouponFilter } from "./counters.service.js";

/** Fields of a store a coupon card actually renders. */
export const STORE_CARD_FIELDS =
  "name slug logo brandColor affiliateUrl websiteUrl trackingParams verified domain " +
  "activeCouponCount codeCount dealCount bestOffer";

export const SORTERS: Record<CouponSort, Record<string, 1 | -1>> = {
  best: { priority: -1, verified: -1, discountValue: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  expiring: { expiresAt: 1 },
  popular: { uses: -1, clicks: -1, views: -1 },
  discount: { discountValue: -1, priority: -1 },
  alphabetical: { title: 1 },
};

/** Resolves an id-or-slug to an id, or null when nothing matches. */
async function resolveStoreId(value: string): Promise<string | null> {
  if (isObjectId(value)) return value;
  const store = await StoreModel.findOne({ slug: slugify(value) }).select("_id").lean();
  return store ? String(store._id) : null;
}

async function resolveCategoryId(value: string): Promise<string | null> {
  if (isObjectId(value)) return value;
  const category = await CategoryModel.findOne({ slug: slugify(value) })
    .select("_id")
    .lean();
  return category ? String(category._id) : null;
}

async function resolveTagId(value: string): Promise<string | null> {
  if (isObjectId(value)) return value;
  const tag = await TagModel.findOne({ slug: slugify(value) }).select("_id").lean();
  return tag ? String(tag._id) : null;
}

/**
 * Turns the validated query into a Mongo filter.
 *
 * Returns `null` when a named store/category/tag does not exist, which the
 * controller turns into an empty page rather than "every coupon on the site" —
 * a wrong filter silently ignored is worse than an empty result.
 */
export async function buildCouponFilter(
  query: ListCouponsQuery,
  { allowDrafts = false } = {}
): Promise<FilterQuery<Coupon> | null> {
  const filter: FilterQuery<Coupon> = {};
  const and: FilterQuery<Coupon>[] = [];

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  } else if (query.status === "all") {
    if (!allowDrafts) filter.status = { $ne: "draft" };
  } else {
    // The default view is "what a shopper can use right now".
    Object.assign(filter, liveCouponFilter());
  }

  if (query.store) {
    const storeId = await resolveStoreId(query.store);
    if (!storeId) return null;
    filter.store = storeId;
  }

  if (query.category) {
    const categoryId = await resolveCategoryId(query.category);
    if (!categoryId) return null;
    filter.categories = categoryId;
  }

  if (query.tag) {
    const tagId = await resolveTagId(query.tag);
    if (!tagId) return null;
    filter.tags = tagId;
  }

  if (query.type) filter.type = query.type;
  if (query.country) filter.country = query.country.toUpperCase();

  if (query.featured) filter.featured = true;
  if (query.exclusive) filter.exclusive = true;
  if (query.verified) filter.verified = true;
  if (query.trending) filter.trending = true;
  if (query.editorsPick) filter.editorsPick = true;

  if (query.withCode === true) filter.type = { $in: CODE_BEARING_TYPES };
  if (query.withCode === false) filter.type = { $nin: CODE_BEARING_TYPES };

  if (query.minDiscount !== undefined) {
    filter.discountValue = { $gte: query.minDiscount };
  }

  if (query.expiringSoon) {
    filter.neverExpires = { $ne: true };
    filter.expiresAt = {
      $gte: new Date(),
      $lte: new Date(Date.now() + 7 * 86_400_000),
    };
  }

  if (query.search) {
    // A regex rather than $text: shoppers search for "50% off" and partial
    // brand names, which a stemmed text index handles badly.
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    and.push({
      $or: [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { tagNames: { $regex: escaped, $options: "i" } },
      ],
    });
  }

  if (and.length) filter.$and = and;

  return filter;
}

/* =========================================================
   WRITE PAYLOAD
========================================================= */

type CouponPatch = Partial<Record<keyof Coupon, unknown>>;

const PASS_THROUGH = [
  "type",
  "discountType",
  "discountValue",
  "discountLabel",
  "minimumSpend",
  "maximumDiscount",
  "priority",
  "status",
  "neverExpires",
  "verified",
  "exclusive",
  "featured",
  "trending",
  "editorsPick",
  "staffPick",
  "categories",
  "tagNames",
  "startsAt",
  "expiresAt",
  "store",
] as const;

/**
 * Maps a validated body onto a Mongo `$set` patch.
 *
 * Zod has already checked shape and range; this layer is about sanitising
 * free text and normalising the fields the database cares about.
 */
export function buildCouponPatch(
  body: CreateCouponBody | UpdateCouponBody
): CouponPatch {
  const patch: CouponPatch = {};
  const source = body as Record<string, unknown>;

  for (const key of PASS_THROUGH) {
    if (source[key] !== undefined) patch[key as keyof Coupon] = source[key];
  }

  if (source.title !== undefined) patch.title = sanitizePlain(source.title);
  if (source.description !== undefined) {
    patch.description = sanitizeMultiline(source.description);
  }
  if (source.terms !== undefined) patch.terms = sanitizeRich(source.terms);

  if (source.code !== undefined) {
    const code = sanitizePlain(source.code).toUpperCase().replace(/\s+/g, "");
    patch.code = code || undefined;
  }

  if (source.currency !== undefined) {
    patch.currency = sanitizePlain(source.currency).toUpperCase() || "USD";
  }
  if (source.country !== undefined) {
    patch.country = sanitizePlain(source.country).toUpperCase() || "US";
  }

  if (source.destinationUrl !== undefined) {
    patch.destinationUrl = normalizeUrl(source.destinationUrl) ?? undefined;
  }
  if (source.landingUrl !== undefined) {
    patch.landingUrl = normalizeUrl(source.landingUrl) ?? undefined;
  }

  if (source.image !== undefined) patch.image = normalizeImage(source.image);

  if (source.metaTitle !== undefined) patch.metaTitle = sanitizePlain(source.metaTitle);
  if (source.metaDescription !== undefined) {
    patch.metaDescription = sanitizePlain(source.metaDescription);
  }

  // A code offer whose code was cleared is a deal, not a broken code offer.
  if (patch.type === "code" && patch.code === undefined && "code" in source) {
    patch.type = "deal";
  }

  if (patch.verified === true) patch.verifiedAt = new Date();
  if (patch.verified === false) patch.verifiedAt = null;

  return patch;
}

/** Creates any tag that does not exist yet and returns all their ids. */
export async function resolveTagNames(names: string[]): Promise<string[]> {
  const cleaned = [
    ...new Set(names.map((name) => sanitizePlain(name)).filter(Boolean)),
  ];

  if (!cleaned.length) return [];

  const ids: string[] = [];

  for (const name of cleaned) {
    const slug = slugify(name);
    const tag = await TagModel.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug } },
      { new: true, upsert: true }
    )
      .select("_id")
      .lean();

    if (tag) ids.push(String(tag._id));
  }

  return ids;
}
