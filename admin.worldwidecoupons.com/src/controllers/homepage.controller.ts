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
  const bestOffersIds = config?.bestOffersCoupons ?? [];
  const trendingIds = config?.trendingCoupons ?? [];
  const promoIds = config?.promoCoupons ?? [];

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
    bestOffersCoupons,
    trendingPicks,
    promoPicks,
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
          .select("name slug icon color activeCouponCount image banner")
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
      .select("name slug icon color activeCouponCount image banner")
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

    bestOffersIds.length
      ? CouponModel.find({ _id: { $in: bestOffersIds }, ...live })
          .populate("store", STORE_CARD_FIELDS)
          .lean()
      : [],

    trendingIds.length
      ? CouponModel.find({ _id: { $in: trendingIds }, ...live })
          .populate("store", STORE_CARD_FIELDS)
          .lean()
      : [],

    // Categories are populated here (and only here) so the promo-code
    // section can offer filter pills for whatever its picks belong to.
    promoIds.length
      ? CouponModel.find({ _id: { $in: promoIds }, ...live })
          .populate("store", STORE_CARD_FIELDS)
          .populate("categories", "name slug")
          .lean()
      : [],
  ]);

  const inPickedOrder = <T extends { _id: unknown }>(ids: unknown[], docs: T[]) => {
    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
    return ids.map((id) => byId.get(String(id))).filter((doc): doc is T => Boolean(doc));
  };

  const featured = curatedCoupons.length ? curatedCoupons : autoCoupons;

  // Keep the admin's picked order (Mongo's `$in` doesn't) and drop any pick
  // that's expired or gone since it was curated.
  const bestOffersById = new Map(bestOffersCoupons.map((coupon) => [String(coupon._id), coupon]));
  const orderedBestOffers = bestOffersIds
    .map((id) => bestOffersById.get(String(id)))
    .filter((coupon): coupon is (typeof bestOffersCoupons)[number] => Boolean(coupon));

  const mainId = config?.bestOffersMain ? String(config.bestOffersMain) : null;
  const bestOffersMain = orderedBestOffers.length
    ? (orderedBestOffers.find((coupon) => String(coupon._id) === mainId) ?? orderedBestOffers[0])
    : featured[0];
  const bestOffersSide = orderedBestOffers.length
    ? orderedBestOffers.filter((coupon) => String(coupon._id) !== String(bestOffersMain?._id)).slice(0, 4)
    : featured.slice(1, 5);

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
    banners: (config?.heroBanners ?? [])
      .filter((banner) => banner.active !== false && (banner.image?.url || banner.title))
      .slice()
      .sort((a, b) => a.order - b.order),
    featured: decorateCoupons(featured),
    bestOffers: {
      main: decorateCoupon(bestOffersMain ?? null),
      side: decorateCoupons(bestOffersSide),
    },
    trending: decorateCoupons(inPickedOrder(trendingIds, trendingPicks).slice(0, 6)),
    promoCodes: decorateCoupons(inPickedOrder(promoIds, promoPicks).slice(0, 10)),
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
    "heroBanners",
    "featuredCoupons",
    "featuredStores",
    "featuredCategories",
    "bestOffersMain",
    "bestOffersCoupons",
    "trendingCoupons",
    "promoCoupons",
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
