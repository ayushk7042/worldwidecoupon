import { z } from "zod";
import { STORE_STATUSES } from "../models/Store.js";
import {
  bodyBool,
  objectId,
  optionalText,
  optionalUrl,
  queryBool,
  requiredText,
} from "./common.js";

export const STORE_SORTS = [
  "popular",
  "name",
  "newest",
  "priority",
  "offers",
  "clicks",
] as const;

export const listStoresQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(24),

  search: optionalText(120),
  category: z.string().trim().optional(),
  /** A single initial, or `#` for everything that starts with a digit/symbol. */
  letter: z.string().trim().max(1).optional(),
  country: optionalText(4),

  status: z.union([z.enum(STORE_STATUSES), z.literal("all")]).default("active"),
  sort: z.enum(STORE_SORTS).default("popular"),

  featured: queryBool,
  popular: queryBool,
  trending: queryBool,
  withOffers: queryBool,
});
export type ListStoresQuery = z.infer<typeof listStoresQuery>;

const highlight = z.object({
  label: requiredText("Highlight label", 80),
  value: optionalText(120).default(""),
});

const faq = z.object({
  question: requiredText("Question", 300),
  answer: z.string().max(4000).default(""),
});

const storeCore = {
  name: requiredText("Store name", 160),
  slug: optionalText(220),

  tagline: optionalText(200),
  description: z.string().max(2000).optional(),
  about: z.string().max(60_000).optional(),

  websiteUrl: optionalUrl,
  affiliateUrl: optionalUrl,
  trackingParams: optionalText(400),

  logo: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
  banner: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
  ogImage: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
  brandColor: optionalText(20),

  categories: z.array(objectId).default([]),
  primaryCategory: z.union([objectId, z.null()]).optional(),

  country: optionalText(4),
  currency: optionalText(4),

  featured: bodyBool.optional(),
  popular: bodyBool.optional(),
  trending: bodyBool.optional(),
  verified: bodyBool.optional(),
  exclusive: bodyBool.optional(),

  priority: z.coerce.number().int().min(-100).max(1000).optional(),
  status: z.enum(STORE_STATUSES).optional(),

  highlights: z.array(highlight).max(20).optional(),
  faqs: z.array(faq).max(30).optional(),
  howToRedeem: z.array(z.string().trim().max(500)).max(15).optional(),

  averageDiscount: optionalText(60),

  metaTitle: optionalText(180),
  metaDescription: optionalText(400),
  focusKeyword: optionalText(120),
  canonicalUrl: optionalUrl,
  robots: optionalText(80),
  schemaMarkup: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
};

export const createStoreBody = z.object(storeCore);
export type CreateStoreBody = z.infer<typeof createStoreBody>;

export const updateStoreBody = z
  .object({ ...storeCore, name: optionalText(160) })
  .partial();
export type UpdateStoreBody = z.infer<typeof updateStoreBody>;

export const bulkStoreStatusBody = z.object({
  ids: z.array(objectId).min(1, "Select at least one store"),
  status: z.enum(STORE_STATUSES),
});
