/**
 * The three read-only values every coupon card needs.
 *
 * They live here rather than only as Mongoose virtuals because almost every
 * read is `.lean()` for speed, and lean documents carry no virtuals. The
 * schema's virtuals call these same functions, so a coupon looks identical
 * whether it arrived lean or as a full document.
 */

/** True once the offer is past its date. Offers can also never expire. */
const isExpired = (coupon) => {
  if (!coupon || coupon.neverExpires || !coupon.expiresAt) return false;
  return new Date(coupon.expiresAt) < new Date();
};

/** Percentage of shoppers it worked for, or null when too few have voted. */
const successRate = (coupon) => {
  const good = coupon?.successVotes || 0;
  const bad = coupon?.failVotes || 0;
  const total = good + bad;

  if (total < 3) return null;
  return Math.round((good / total) * 100);
};

/** The short text on the coloured badge: "40% OFF", "$15 OFF", "DEAL". */
const badge = (coupon) => {
  if (!coupon) return "";
  if (coupon.discountLabel) return coupon.discountLabel;

  const value = coupon.discountValue;

  if (coupon.discountType === "percent" && value) return `${value}% OFF`;
  if (coupon.discountType === "fixed" && value) return `$${value} OFF`;
  if (coupon.discountType === "shipping") return "FREE SHIPPING";
  if (coupon.discountType === "gift") return "FREE GIFT";

  return coupon.type === "code" ? "CODE" : "DEAL";
};

/**
 * Adds the computed fields to a lean coupon, and hides the code.
 *
 * The code is the whole product — handing it out in a list response would let
 * anyone scrape every code without ever visiting a store link. Listings say
 * only whether a code exists; the real value comes back from /reveal.
 */
const decorateCoupon = (coupon, { includeCode = false } = {}) => {
  if (!coupon) return coupon;

  const view = {
    ...coupon,
    badge: badge(coupon),
    successRate: successRate(coupon),
    isExpired: isExpired(coupon),
    hasCode: Boolean(coupon.code),
  };

  if (!includeCode) delete view.code;

  return view;
};

const decorateCoupons = (list = [], options) =>
  (Array.isArray(list) ? list : []).map((item) => decorateCoupon(item, options));

module.exports = { badge, successRate, isExpired, decorateCoupon, decorateCoupons };
