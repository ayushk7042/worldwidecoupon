import mongoose from "mongoose";
import { CategoryModel } from "../models/Category.js";
import { CODE_BEARING_TYPES, CouponModel } from "../models/Coupon.js";
import { StoreModel } from "../models/Store.js";
import { idOf } from "../utils/objectId.js";

/**
 * Denormalised counters.
 *
 * Every listing page sorts by "how many live offers does this store have",
 * which is unaffordable as a `$lookup` on each request. These functions are
 * the single place those numbers are recomputed, and every write path that
 * could change them calls in here.
 */

/** Offers that are live right now, whatever their stored status claims. */
export const liveCouponFilter = (now = new Date()) => ({
  status: "active" as const,
  $or: [
    { neverExpires: true },
    { expiresAt: null },
    { expiresAt: { $gte: now } },
  ],
});

const bestOfferLabel = (coupon: {
  title?: string;
  discountLabel?: string;
  discountType?: string;
  discountValue?: number;
} | null): string => {
  if (!coupon) return "";
  if (coupon.discountLabel) return coupon.discountLabel;

  if (coupon.discountType === "percent" && coupon.discountValue) {
    return `${coupon.discountValue}% off`;
  }
  if (coupon.discountType === "fixed" && coupon.discountValue) {
    return `$${coupon.discountValue} off`;
  }

  return coupon.title ?? "";
};

/** Recomputes `couponCount`, `activeCouponCount`, `codeCount` and `bestOffer`. */
export async function refreshStoreCounts(storeId: unknown): Promise<void> {
  const id = idOf(storeId);
  if (!id) return;

  const live = liveCouponFilter();

  const [total, active, codes, deals, best] = await Promise.all([
    CouponModel.countDocuments({ store: id, status: { $ne: "archived" } }),
    CouponModel.countDocuments({ store: id, ...live }),
    CouponModel.countDocuments({
      store: id,
      ...live,
      type: { $in: CODE_BEARING_TYPES },
    }),
    CouponModel.countDocuments({
      store: id,
      ...live,
      type: { $nin: CODE_BEARING_TYPES },
    }),
    CouponModel.findOne({ store: id, ...live })
      .sort({ priority: -1, discountValue: -1, createdAt: -1 })
      .select("title discountType discountValue discountLabel")
      .lean(),
  ]);

  await StoreModel.updateOne(
    { _id: id },
    {
      $set: {
        couponCount: total,
        activeCouponCount: active,
        codeCount: codes,
        dealCount: deals,
        bestOffer: bestOfferLabel(best),
      },
    }
  );
}

export async function refreshManyStoreCounts(storeIds: unknown[]): Promise<void> {
  const unique = [...new Set(storeIds.map(idOf).filter((id): id is string => !!id))];

  // Sequential on purpose: a bulk status change can touch 200 stores, and 200
  // concurrent multi-query refreshes would saturate the connection pool.
  for (const id of unique) {
    await refreshStoreCounts(id);
  }
}

/** Recomputes the per-category store and coupon totals. */
export async function refreshCategoryCounts(categoryId?: unknown): Promise<void> {
  const id = idOf(categoryId);
  const scope = id ? { _id: new mongoose.Types.ObjectId(id) } : {};

  const categories = await CategoryModel.find(scope).select("_id").lean();
  const live = liveCouponFilter();

  for (const category of categories) {
    const [stores, coupons, activeCoupons] = await Promise.all([
      StoreModel.countDocuments({ categories: category._id, status: "active" }),
      CouponModel.countDocuments({
        categories: category._id,
        status: { $ne: "archived" },
      }),
      CouponModel.countDocuments({ categories: category._id, ...live }),
    ]);

    await CategoryModel.updateOne(
      { _id: category._id },
      {
        $set: {
          storeCount: stores,
          couponCount: coupons,
          activeCouponCount: activeCoupons,
        },
      }
    );
  }
}

/** Flips every offer that has passed its date. Run on boot and by the cron. */
export async function expireDueCoupons(): Promise<number> {
  const result = await CouponModel.updateMany(
    {
      status: "active",
      neverExpires: { $ne: true },
      expiresAt: { $ne: null, $lt: new Date() },
    },
    { $set: { status: "expired" } }
  );

  return result.modifiedCount ?? 0;
}
