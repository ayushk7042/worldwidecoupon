import { z } from "zod";
import {
  COUPON_STATUSES,
  COUPON_TYPES,
  DISCOUNT_TYPES,
} from "../models/Coupon.js";
import {
  bodyBool,
  csvArray,
  objectId,
  optionalDate,
  optionalText,
  optionalUrl,
  queryBool,
  requiredText,
} from "./common.js";

export const COUPON_SORTS = [
  "best",
  "newest",
  "expiring",
  "popular",
  "discount",
  "alphabetical",
] as const;
export type CouponSort = (typeof COUPON_SORTS)[number];

export const listCouponsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  /** Accepts an id or a slug for both, so the frontend never has to resolve one. */
  store: z.string().trim().optional(),
  category: z.string().trim().optional(),
  tag: z.string().trim().optional(),

  type: z.enum(COUPON_TYPES).optional(),
  status: z.union([z.enum(COUPON_STATUSES), z.literal("all")]).optional(),

  search: optionalText(160),
  sort: z.enum(COUPON_SORTS).default("best"),

  featured: queryBool,
  exclusive: queryBool,
  verified: queryBool,
  trending: queryBool,
  editorsPick: queryBool,
  withCode: queryBool,
  expiringSoon: queryBool,

  country: optionalText(4),
  minDiscount: z.coerce.number().min(0).optional(),
});
export type ListCouponsQuery = z.infer<typeof listCouponsQuery>;

const couponCore = {
  title: requiredText("Title"),
  slug: optionalText(220),

  description: z.string().max(5000).optional(),
  terms: z.string().max(5000).optional(),

  type: z.enum(COUPON_TYPES).default("deal"),
  code: optionalText(60),

  discountType: z.enum(DISCOUNT_TYPES).default("other"),
  discountValue: z.coerce.number().min(0).max(1_000_000).optional(),
  discountLabel: optionalText(60),
  currency: optionalText(4),

  minimumSpend: z.coerce.number().min(0).optional(),
  maximumDiscount: z.coerce.number().min(0).optional(),

  store: objectId,
  categories: z.array(objectId).default([]),
  tagNames: z.array(z.string().trim().min(1).max(60)).max(20).default([]),

  country: optionalText(4),

  destinationUrl: optionalUrl,
  landingUrl: optionalUrl,

  startsAt: optionalDate,
  expiresAt: optionalDate,
  neverExpires: bodyBool.optional(),

  verified: bodyBool.optional(),
  exclusive: bodyBool.optional(),
  featured: bodyBool.optional(),
  trending: bodyBool.optional(),
  editorsPick: bodyBool.optional(),
  staffPick: bodyBool.optional(),

  priority: z.coerce.number().int().min(-100).max(1000).optional(),
  status: z.enum(COUPON_STATUSES).optional(),

  image: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),

  metaTitle: optionalText(180),
  metaDescription: optionalText(400),
};

/**
 * A code-bearing offer without a code is the single mistake that breaks the
 * whole UX — the shopper clicks "Get code" and gets nothing — so it is caught
 * here rather than silently downgraded.
 */
const needsCode = <T extends { type?: string; code?: string }>(value: T, ctx: z.RefinementCtx) => {
  if (value.type === "code" && !value.code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["code"],
      message: "A code offer needs a code",
    });
  }
};

export const createCouponBody = z.object(couponCore).superRefine(needsCode);
export type CreateCouponBody = z.infer<typeof createCouponBody>;

export const updateCouponBody = z
  .object({ ...couponCore, store: objectId.optional(), title: optionalText(300) })
  .partial()
  .superRefine(needsCode);
export type UpdateCouponBody = z.infer<typeof updateCouponBody>;

export const voteBody = z.object({
  worked: z.union([z.boolean(), z.string()]).transform((value) =>
    typeof value === "boolean" ? value : value !== "false"
  ),
});

export const statusBody = z.object({ status: z.enum(COUPON_STATUSES) });

export const bulkStatusBody = z.object({
  ids: z.array(objectId).min(1, "Select at least one coupon"),
  status: z.enum(COUPON_STATUSES),
});

export const bulkDeleteBody = z.object({
  ids: z.array(objectId).min(1, "Select at least one coupon"),
});

export const searchQuery = z.object({
  q: requiredText("Search term", 160),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  types: csvArray,
});
