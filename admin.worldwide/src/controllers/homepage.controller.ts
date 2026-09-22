import { CategoryModel } from "../models/Category.js";
import { CouponModel } from "../models/Coupon.js";
import { HomepageModel } from "../models/Homepage.js";
import { StoreModel } from "../models/Store.js";
import { STORE_CARD_FIELDS } from "../services/coupon.service.js";
import { liveCouponFilter } from "../services/counters.service.js";
import { decorateCoupon, decorateCoupons } from "../services/couponView.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendOk } from "../utils/response.js";

const STORE_CARD = "name slug logo brandColor activeCouponCount bestOffer verified";

async function loadSingleton() {
  return HomepageModel.findOneAndUpdate(
    { singleton: "homepage" },
    { $setOnInsert: { singleton: "homepage" } },
    { new: true, upsert: true }
  ).lean();
}

/**
 * GET /api/homepage
 *
 * Curated picks win; anything an editor left empty falls back to a query, so
 * the homepage is never blank on a fresh install or after a data import.
 */
export const getHomepage = asyncHandler(async (_req, res) => {
  const config = await loadSingleton();
  const live = liveCouponFilter();

  const curatedCouponIds = config?.featuredCoupons ?? [];
  const curatedStoreIds = config?.featuredStores ?? [];
  const curatedCategoryIds = config?.featuredCategories ?? [];

  const [
    heroCoupon,
    curatedCoupons,
    curatedStores,
    curatedCategories,
    autoCoupons,
    autoStores,
    autoCategories,
    newest,
    expiring,
  ] = await Promise.all([
    config?.heroCoupon
      ? CouponModel.findById(config.heroCoupon).populate("store", STORE_CARD_FIELDS).lean()
      : null,

    curatedCouponIds.length
      ? CouponModel.find({ _id: { $in: curatedCouponIds }, ...live })
          .populate("store", STORE_CARD_FIELDS)
          .lean()
      : [],

    curatedStoreIds.length
      ? StoreModel.find({ _id: { $in: curatedStoreIds }, status: "active" })
          .select(STORE_CARD)
          .lean()
      : [],

    curatedCategoryIds.length
      ? CategoryModel.find({ _id: { $in: curatedCategoryIds }, status: "active" })
          .select("name slug icon color activeCouponCount image")
          .lean()
      : [],

    // No `featured: true` filter. A freshly imported site has nothing flagged
    // yet, and an empty hero rail looks broken; ranking by the flag rather
    // than filtering on it means curation still wins when it exists.
    CouponModel.find(live)
      .sort({ featured: -1, priority: -1, verified: -1, discountValue: -1, createdAt: -1 })
      .limit(12)
      .populate("store", STORE_CARD_FIELDS)
      .lean(),

    StoreModel.find({ status: "active", activeCouponCount: { $gt: 0 } })
      .sort({ featured: -1, priority: -1, activeCouponCount: -1 })
      .limit(18)
      .select(STORE_CARD)
      .lean(),

    CategoryModel.find({ status: "active", hidden: { $ne: true }, showOnHome: true })
      .sort({ priority: -1, activeCouponCount: -1 })
      .limit(12)
      .select("name slug icon color activeCouponCount image")
      .lean(),

    CouponModel.find(live)
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("store", STORE_CARD_FIELDS)
      .lean(),

    CouponModel.find({
      ...live,
      neverExpires: { $ne: true },
      expiresAt: { $gte: new Date(), $lte: new Date(Date.now() + 5 * 86_400_000) },
    })
      .sort({ expiresAt: 1 })
      .limit(8)
      .populate("store", STORE_CARD_FIELDS)
      .lean(),
  ]);

  const featured = curatedCoupons.length ? curatedCoupons : autoCoupons;

  const sections = await Promise.all(
    (config?.categorySections ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(async (section) => {
        const [category, coupons] = await Promise.all([
          CategoryModel.findById(section.category)
            .select("name slug icon color")
            .lean(),
          CouponModel.find({ categories: section.category, ...live })
            .sort({ priority: -1, createdAt: -1 })
            .limit(8)
            .populate("store", STORE_CARD_FIELDS)
            .lean(),
        ]);

        return {
          heading: section.heading ?? category?.name ?? "",
          category,
          coupons: decorateCoupons(coupons),
        };
      })
  );

  sendOk(res, {
    announcement: config?.announcement?.active ? config.announcement : null,
    hero: {
      heading: config?.heroHeading ?? null,
      subheading: config?.heroSubheading ?? null,
      image: config?.heroImage ?? null,
      coupon: decorateCoupon(heroCoupon ?? featured[0] ?? newest[0] ?? null),
    },
    featured: decorateCoupons(featured),
    newest: decorateCoupons(newest),
    expiring: decorateCoupons(expiring),
    stores: curatedStores.length ? curatedStores : autoStores,
    categories: curatedCategories.length ? curatedCategories : autoCategories,
    sections: sections.filter((section) => section.category),
    blocks: (config?.customBlocks ?? []).slice().sort((a, b) => a.order - b.order),
  });
});

/** GET /api/homepage/config — the raw document, for the admin editor. */
export const getConfig = asyncHandler(async (_req, res) => {
  const config = await loadSingleton();
  sendOk(res, config);
});

/** PUT /api/homepage/config */
export const updateConfig = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;

  const allowed = [
    "heroCoupon",
    "heroHeading",
    "heroSubheading",
    "heroImage",
    "featuredCoupons",
    "featuredStores",
    "featuredCategories",
    "categorySections",
    "customBlocks",
    "announcement",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  const config = await HomepageModel.findOneAndUpdate(
    { singleton: "homepage" },
    { $set: patch },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  sendOk(res, config, { message: "Homepage updated" });
});
