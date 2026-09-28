import { CategoryModel } from "../models/Category.js";
import { CouponModel } from "../models/Coupon.js";
import { StoreModel } from "../models/Store.js";
import { STORE_CARD_FIELDS } from "../services/coupon.service.js";
import { liveCouponFilter } from "../services/counters.service.js";
import { decorateCoupons } from "../services/couponView.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendOk } from "../utils/response.js";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /api/search?q=
 *
 * One call behind the header search box. Stores come first because a shopper
 * typing "nike" almost always wants the Nike page, not a coupon whose title
 * happens to mention Nike.
 */
export const search = asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

  if (q.length < 2) {
    return sendOk(res, { stores: [], coupons: [], categories: [] });
  }

  const pattern = { $regex: escapeRegex(q), $options: "i" as const };

  const [stores, coupons, categories] = await Promise.all([
    StoreModel.find({
      status: "active",
      $or: [{ name: pattern }, { domain: pattern }],
    })
      // An exact-ish prefix match should beat a mid-string one, which sorting
      // by offer count approximates well enough without a scoring pipeline.
      .sort({ activeCouponCount: -1, name: 1 })
      .limit(limit)
      .select("name slug logo brandColor activeCouponCount bestOffer")
      .lean(),

    CouponModel.find({
      ...liveCouponFilter(),
      $or: [{ title: pattern }, { tagNames: pattern }],
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .populate("store", STORE_CARD_FIELDS)
      .lean(),

    CategoryModel.find({ status: "active", hidden: { $ne: true }, name: pattern })
      .sort({ activeCouponCount: -1 })
      .limit(5)
      .select("name slug icon color activeCouponCount")
      .lean(),
  ]);

  sendOk(res, {
    query: q,
    stores,
    coupons: decorateCoupons(coupons),
    categories,
  });
});

/**
 * GET /api/search/suggest — typeahead only: names, nothing else.
 * Deliberately tiny so it can be called on every keystroke.
 */
export const suggest = asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();

  if (q.length < 2) return sendOk(res, []);

  const pattern = { $regex: `^${escapeRegex(q)}`, $options: "i" as const };

  const stores = await StoreModel.find({ status: "active", name: pattern })
    .sort({ activeCouponCount: -1 })
    .limit(8)
    .select("name slug logo activeCouponCount")
    .lean();

  sendOk(
    res,
    stores.map((store) => ({
      label: store.name,
      slug: store.slug,
      logo: store.logo?.url ?? null,
      offers: store.activeCouponCount,
    }))
  );
});
