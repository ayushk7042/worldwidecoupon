import { CODE_BEARING_TYPES, type Coupon } from "../models/Coupon.js";

/**
 * The read-only fields every coupon card needs.
 *
 * They live here rather than only as Mongoose virtuals because almost every
 * read is `.lean()` for speed, and lean documents carry no virtuals.
 */
export type LeanCoupon = Partial<Coupon> & Record<string, unknown>;

export interface CouponView extends Omit<LeanCoupon, "code"> {
  badge: string;
  successRate: number | null;
  isExpired: boolean;
  isStarted: boolean;
  hasCode: boolean;
  expiresIn: number | null;
  /** Present only when the caller is allowed to see the code. */
  code?: string;
}

export const isExpired = (coupon: LeanCoupon | null): boolean => {
  if (!coupon || coupon.neverExpires || !coupon.expiresAt) return false;
  return new Date(coupon.expiresAt as Date).getTime() < Date.now();
};

export const isStarted = (coupon: LeanCoupon | null): boolean => {
  if (!coupon?.startsAt) return true;
  return new Date(coupon.startsAt as Date).getTime() <= Date.now();
};

/** Whole days until it dies, or null when it never does. */
export const expiresIn = (coupon: LeanCoupon | null): number | null => {
  if (!coupon || coupon.neverExpires || !coupon.expiresAt) return null;
  const ms = new Date(coupon.expiresAt as Date).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
};

/** Percentage of shoppers it worked for, or null when too few have voted. */
export const successRate = (coupon: LeanCoupon | null): number | null => {
  const good = Number(coupon?.successVotes ?? 0);
  const bad = Number(coupon?.failVotes ?? 0);
  const total = good + bad;

  if (total < 3) return null;
  return Math.round((good / total) * 100);
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
};

/** The short text on the coloured badge: "40% OFF", "$15 OFF", "DEAL". */
export const badge = (coupon: LeanCoupon | null): string => {
  if (!coupon) return "";
  if (coupon.discountLabel) return String(coupon.discountLabel);

  const value = Number(coupon.discountValue ?? 0);
  const symbol = CURRENCY_SYMBOLS[String(coupon.currency ?? "USD")] ?? "$";

  if (coupon.discountType === "percent" && value) return `${value}% OFF`;
  if (coupon.discountType === "fixed" && value) return `${symbol}${value} OFF`;
  if (coupon.discountType === "shipping") return "FREE SHIPPING";
  if (coupon.discountType === "gift") return "FREE GIFT";
  if (coupon.discountType === "bogo") return "BOGO";

  if (coupon.type === "cashback") return "CASHBACK";
  if (coupon.type === "freeshipping") return "FREE SHIPPING";

  return CODE_BEARING_TYPES.includes(coupon.type as never) ? "CODE" : "DEAL";
};

export interface DecorateOptions {
  /** Only `/reveal` and the admin API pass this. */
  includeCode?: boolean;
}

/**
 * Adds the computed fields to a lean coupon and, by default, strips the code.
 *
 * The code is the entire product. Returning it in a list response would let
 * anyone scrape every code in the database without ever following a store
 * link — which is how the site earns. Listings say only whether a code
 * exists; the real value comes back from `/reveal`, which is counted.
 */
export function decorateCoupon(
  coupon: LeanCoupon | null,
  options: DecorateOptions = {}
): CouponView | null {
  if (!coupon) return null;

  const { code, ...rest } = coupon;

  const view: CouponView = {
    ...rest,
    badge: badge(coupon),
    successRate: successRate(coupon),
    isExpired: isExpired(coupon),
    isStarted: isStarted(coupon),
    expiresIn: expiresIn(coupon),
    hasCode: Boolean(code),
  };

  if (options.includeCode && code) view.code = String(code);

  return view;
}

export function decorateCoupons(
  list: LeanCoupon[] | null | undefined,
  options: DecorateOptions = {}
): CouponView[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => decorateCoupon(item, options))
    .filter((item): item is CouponView => item !== null);
}
