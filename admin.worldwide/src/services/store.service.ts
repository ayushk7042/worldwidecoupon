import type { FilterQuery } from "mongoose";
import { CategoryModel } from "../models/Category.js";
import { normalizeImage } from "../models/shared/image.schema.js";
import type { Store } from "../models/Store.js";
import { idsOf, isObjectId } from "../utils/objectId.js";
import { sanitizePlain, sanitizeRich } from "../utils/sanitize.js";
import { slugify } from "../utils/text.js";
import { hostnameOf, normalizeUrl, originOf } from "../utils/url.js";
import type {
  CreateStoreBody,
  ListStoresQuery,
  UpdateStoreBody,
} from "../validators/store.validator.js";

export const STORE_SORTERS: Record<string, Record<string, 1 | -1>> = {
  popular: { activeCouponCount: -1, views: -1, name: 1 },
  name: { name: 1 },
  newest: { createdAt: -1 },
  priority: { priority: -1, name: 1 },
  offers: { activeCouponCount: -1, name: 1 },
  clicks: { clicks: -1, name: 1 },
};

export async function buildStoreFilter(
  query: ListStoresQuery
): Promise<FilterQuery<Store> | null> {
  const filter: FilterQuery<Store> = {};

  if (query.status !== "all") filter.status = query.status;
  if (query.country) filter.country = query.country.toUpperCase();

  if (query.featured) filter.featured = true;
  if (query.popular) filter.popular = true;
  if (query.trending) filter.trending = true;
  if (query.withOffers) filter.activeCouponCount = { $gt: 0 };

  if (query.category) {
    const categoryId = isObjectId(query.category)
      ? query.category
      : (
          await CategoryModel.findOne({ slug: slugify(query.category) })
            .select("_id")
            .lean()
        )?._id;

    if (!categoryId) return null;
    filter.categories = categoryId;
  }

  // The A–Z rail. "#" collects everything that does not start with a letter.
  if (query.letter) {
    filter.name =
      query.letter === "#"
        ? { $regex: "^[^a-zA-Z]" }
        : { $regex: `^${query.letter.replace(/[^a-zA-Z]/g, "")}`, $options: "i" };
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { domain: { $regex: escaped, $options: "i" } },
      { tagline: { $regex: escaped, $options: "i" } },
    ];
  }

  return filter;
}

type StorePatch = Partial<Record<keyof Store, unknown>>;

const PASS_THROUGH = [
  "featured",
  "popular",
  "trending",
  "verified",
  "exclusive",
  "priority",
  "status",
  "howToRedeem",
] as const;

export function buildStorePatch(body: CreateStoreBody | UpdateStoreBody): StorePatch {
  const patch: StorePatch = {};
  const source = body as Record<string, unknown>;

  for (const key of PASS_THROUGH) {
    if (source[key] !== undefined) patch[key as keyof Store] = source[key];
  }

  if (source.name !== undefined) patch.name = sanitizePlain(source.name);
  if (source.tagline !== undefined) patch.tagline = sanitizePlain(source.tagline);
  if (source.description !== undefined) {
    patch.description = sanitizePlain(source.description);
  }
  if (source.about !== undefined) patch.about = sanitizeRich(source.about);

  if (source.websiteUrl !== undefined) {
    patch.websiteUrl = normalizeUrl(source.websiteUrl) ?? undefined;
  }
  if (source.affiliateUrl !== undefined) {
    patch.affiliateUrl = normalizeUrl(source.affiliateUrl) ?? undefined;
  }
  if (source.trackingParams !== undefined) {
    patch.trackingParams = sanitizePlain(source.trackingParams).replace(/^[?&]+/, "");
  }

  // The domain is derived, never typed: it drives logo lookup and dedupe, and
  // a hand-entered value drifts out of sync with the links the moment either
  // URL is edited.
  const linkForDomain = patch.affiliateUrl ?? patch.websiteUrl;
  if (linkForDomain !== undefined) {
    patch.domain = hostnameOf(linkForDomain) ?? undefined;
    if (!patch.websiteUrl && linkForDomain) {
      patch.websiteUrl = originOf(linkForDomain) ?? undefined;
    }
  }

  for (const key of ["logo", "banner", "ogImage"] as const) {
    if (source[key] !== undefined) patch[key] = normalizeImage(source[key]);
  }

  if (source.brandColor !== undefined) {
    patch.brandColor = sanitizePlain(source.brandColor);
  }

  if (source.categories !== undefined) patch.categories = idsOf(source.categories);

  if (source.primaryCategory !== undefined) {
    patch.primaryCategory = isObjectId(source.primaryCategory)
      ? source.primaryCategory
      : null;
  }

  if (source.country !== undefined) {
    patch.country = sanitizePlain(source.country).toUpperCase() || "US";
  }
  if (source.currency !== undefined) {
    patch.currency = sanitizePlain(source.currency).toUpperCase() || "USD";
  }

  if (Array.isArray(source.highlights)) {
    patch.highlights = (source.highlights as { label: string; value?: string }[])
      .filter((row) => row?.label)
      .map((row) => ({
        label: sanitizePlain(row.label),
        value: sanitizePlain(row.value ?? ""),
      }));
  }

  if (Array.isArray(source.faqs)) {
    patch.faqs = (source.faqs as { question: string; answer?: string }[])
      .filter((row) => row?.question)
      .map((row) => ({
        question: sanitizePlain(row.question),
        answer: sanitizeRich(row.answer ?? ""),
      }));
  }

  if (Array.isArray(source.howToRedeem)) {
    patch.howToRedeem = (source.howToRedeem as string[])
      .map((step) => sanitizePlain(step))
      .filter(Boolean);
  }

  if (source.averageDiscount !== undefined) {
    patch.averageDiscount = sanitizePlain(source.averageDiscount);
  }

  for (const key of ["metaTitle", "metaDescription", "focusKeyword", "robots"] as const) {
    if (source[key] !== undefined) patch[key] = sanitizePlain(source[key]);
  }

  if (source.canonicalUrl !== undefined) {
    patch.canonicalUrl = normalizeUrl(source.canonicalUrl) ?? undefined;
  }

  if (source.schemaMarkup !== undefined) {
    if (typeof source.schemaMarkup === "string") {
      try {
        patch.schemaMarkup = JSON.parse(source.schemaMarkup);
      } catch {
        // Invalid JSON in a free-text SEO field should not block the save.
        patch.schemaMarkup = null;
      }
    } else {
      patch.schemaMarkup = source.schemaMarkup;
    }
  }

  return patch;
}
