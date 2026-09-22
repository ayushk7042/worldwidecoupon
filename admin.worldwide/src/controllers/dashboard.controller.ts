import { CategoryModel } from "../models/Category.js";
import { ClickEventModel } from "../models/ClickEvent.js";
import { ContactModel } from "../models/Contact.js";
import { CODE_BEARING_TYPES, CouponModel } from "../models/Coupon.js";
import { SiteUserModel } from "../models/SiteUser.js";
import { StoreModel } from "../models/Store.js";
import { liveCouponFilter } from "../services/counters.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendOk } from "../utils/response.js";

/** GET /api/dashboard — the numbers on the admin landing page. */
export const getStats = asyncHandler(async (_req, res) => {
  const live = liveCouponFilter();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const soon = new Date(Date.now() + 7 * 86_400_000);

  const [
    totalCoupons,
    liveCoupons,
    codes,
    expired,
    drafts,
    expiringSoon,
    totalStores,
    activeStores,
    storesWithoutOffers,
    categories,
    shoppers,
    unreadMessages,
    addedThisWeek,
    clicksThisWeek,
  ] = await Promise.all([
    CouponModel.countDocuments({ status: { $ne: "archived" } }),
    CouponModel.countDocuments(live),
    CouponModel.countDocuments({ ...live, type: { $in: CODE_BEARING_TYPES } }),
    CouponModel.countDocuments({ status: "expired" }),
    CouponModel.countDocuments({ status: "draft" }),
    CouponModel.countDocuments({
      ...live,
      neverExpires: { $ne: true },
      expiresAt: { $gte: new Date(), $lte: soon },
    }),
    StoreModel.countDocuments(),
    StoreModel.countDocuments({ status: "active" }),
    StoreModel.countDocuments({ status: "active", activeCouponCount: 0 }),
    CategoryModel.countDocuments({ status: "active" }),
    SiteUserModel.countDocuments({ status: "active" }),
    ContactModel.countDocuments({ status: "new" }),
    CouponModel.countDocuments({ createdAt: { $gte: weekAgo } }),
    ClickEventModel.countDocuments({ createdAt: { $gte: weekAgo } }),
  ]);

  sendOk(res, {
    coupons: {
      total: totalCoupons,
      live: liveCoupons,
      codes,
      deals: liveCoupons - codes,
      expired,
      drafts,
      expiringSoon,
      addedThisWeek,
    },
    stores: {
      total: totalStores,
      active: activeStores,
      // A live store with nothing to offer is a dead page and an SEO liability.
      withoutOffers: storesWithoutOffers,
    },
    categories,
    shoppers,
    unreadMessages,
    clicksThisWeek,
  });
});

/** GET /api/dashboard/top — what is actually earning. */
export const getTopPerformers = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86_400_000);

  const [topStores, topCoupons, byKind] = await Promise.all([
    ClickEventModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$store", clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "stores",
          localField: "_id",
          foreignField: "_id",
          as: "store",
        },
      },
      { $unwind: "$store" },
      {
        $project: {
          clicks: 1,
          name: "$store.name",
          slug: "$store.slug",
          logo: "$store.logo",
        },
      },
    ]),

    ClickEventModel.aggregate([
      { $match: { createdAt: { $gte: since }, coupon: { $ne: null } } },
      { $group: { _id: "$coupon", clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "coupons",
          localField: "_id",
          foreignField: "_id",
          as: "coupon",
        },
      },
      { $unwind: "$coupon" },
      {
        $project: {
          clicks: 1,
          title: "$coupon.title",
          slug: "$coupon.slug",
          type: "$coupon.type",
        },
      },
    ]),

    ClickEventModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$kind", count: { $sum: 1 } } },
    ]),
  ]);

  sendOk(res, {
    days,
    topStores,
    topCoupons,
    byKind: Object.fromEntries(byKind.map((row) => [row._id, row.count])),
  });
});

/** GET /api/dashboard/attention — the work queue: what an editor should fix next. */
export const getAttentionList = asyncHandler(async (_req, res) => {
  const soon = new Date(Date.now() + 7 * 86_400_000);
  const stale = new Date(Date.now() - 60 * 86_400_000);

  const [expiringSoon, unverified, neverChecked, emptyStores] = await Promise.all([
    CouponModel.find({
      ...liveCouponFilter(),
      neverExpires: { $ne: true },
      expiresAt: { $gte: new Date(), $lte: soon },
    })
      .sort({ expiresAt: 1 })
      .limit(20)
      .populate("store", "name slug")
      .select("title slug expiresAt type store")
      .lean(),

    CouponModel.find({ ...liveCouponFilter(), verified: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("store", "name slug")
      .select("title slug type store createdAt")
      .lean(),

    CouponModel.find({
      ...liveCouponFilter(),
      $or: [{ lastCheckedAt: null }, { lastCheckedAt: { $lt: stale } }],
    })
      .sort({ lastCheckedAt: 1 })
      .limit(20)
      .populate("store", "name slug")
      .select("title slug lastCheckedAt store")
      .lean(),

    StoreModel.find({ status: "active", activeCouponCount: 0 })
      .sort({ views: -1 })
      .limit(20)
      .select("name slug views")
      .lean(),
  ]);

  sendOk(res, { expiringSoon, unverified, neverChecked, emptyStores });
});
