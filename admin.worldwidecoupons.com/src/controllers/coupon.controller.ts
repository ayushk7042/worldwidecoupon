import { CODE_BEARING_TYPES, CouponModel } from "../models/Coupon.js";
import { StoreModel } from "../models/Store.js";
import { recordClick, resolveDestination } from "../services/click.service.js";
import {
  buildCouponFilter,
  buildCouponPatch,
  resolveTagNames,
  SORTERS,
  STORE_CARD_FIELDS,
} from "../services/coupon.service.js";
import {
  liveCouponFilter,
  refreshCategoryCounts,
  refreshManyStoreCounts,
  refreshStoreCounts,
} from "../services/counters.service.js";
import {
  decorateCoupon,
  decorateCoupons,
  successRate,
} from "../services/couponView.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idOf, isObjectId } from "../utils/objectId.js";
import { buildPagination, sendCreated, sendOk } from "../utils/response.js";
import { uniqueSlug } from "../utils/slug.js";
import type {
  CreateCouponBody,
  ListCouponsQuery,
  UpdateCouponBody,
} from "../validators/coupon.validator.js";

type BulkStatusBody = { ids: string[]; status: string };

/* =========================================================
   READS
========================================================= */

/** GET /api/coupons — the deals feed behind every listing page. */
export const listCoupons = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListCouponsQuery;
  const isAdmin = Boolean(req.admin);

  const filter = await buildCouponFilter(query, { allowDrafts: isAdmin });

  // A filter naming a store that does not exist must return nothing, not
  // everything — silently dropping it would show the wrong store's coupons.
  if (!filter) {
    return sendOk(res, [], {
      pagination: buildPagination(query.page, query.limit, 0, 0),
    });
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    CouponModel.find(filter)
      .sort(SORTERS[query.sort])
      .skip(skip)
      .limit(query.limit)
      .populate("store", STORE_CARD_FIELDS)
      .populate("categories", "name slug icon color")
      .lean(),
    CouponModel.countDocuments(filter),
  ]);

  sendOk(res, decorateCoupons(items, { includeCode: isAdmin }), {
    pagination: buildPagination(query.page, query.limit, total, items.length),
  });
});

/** GET /api/coupons/feed — every rail the homepage draws, in one round trip. */
export const getFeed = asyncHandler(async (_req, res) => {
  const live = liveCouponFilter();
  const soon = new Date(Date.now() + 5 * 86_400_000);

  const [featured, trending, exclusive, newest, expiring, codes, topStores] =
    await Promise.all([
      // Ranked by the flag rather than filtered on it: a site that nobody has
      // curated yet should still show its best offers, not an empty rail.
      CouponModel.find(live)
        .sort({ featured: -1, priority: -1, verified: -1, createdAt: -1 })
        .limit(8)
        .populate("store", STORE_CARD_FIELDS)
        .lean(),

      CouponModel.find(live)
        .sort({ trending: -1, uses: -1, clicks: -1, createdAt: -1 })
        .limit(12)
        .populate("store", STORE_CARD_FIELDS)
        .lean(),

      CouponModel.find({ ...live, exclusive: true })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("store", STORE_CARD_FIELDS)
        .lean(),

      CouponModel.find(live)
        .sort({ createdAt: -1 })
        .limit(12)
        .populate("store", STORE_CARD_FIELDS)
        .lean(),

      CouponModel.find({
        ...live,
        neverExpires: { $ne: true },
        expiresAt: { $gte: new Date(), $lte: soon },
      })
        .sort({ expiresAt: 1 })
        .limit(8)
        .populate("store", STORE_CARD_FIELDS)
        .lean(),

      CouponModel.find({ ...live, type: { $in: CODE_BEARING_TYPES } })
        .sort({ priority: -1, createdAt: -1 })
        .limit(12)
        .populate("store", STORE_CARD_FIELDS)
        .lean(),

      StoreModel.find({ status: "active", activeCouponCount: { $gt: 0 } })
        .sort({ featured: -1, priority: -1, activeCouponCount: -1 })
        .limit(18)
        .select("name slug logo brandColor activeCouponCount bestOffer verified")
        .lean(),
    ]);

  const hero = featured[0] ?? trending[0] ?? newest[0] ?? null;

  sendOk(res, {
    hero: decorateCoupon(hero),
    featured: decorateCoupons(featured),
    trending: decorateCoupons(trending),
    exclusive: decorateCoupons(exclusive),
    newest: decorateCoupons(newest),
    expiring: decorateCoupons(expiring),
    codes: decorateCoupons(codes),
    topStores,
  });
});

/** GET /api/coupons/:idOrSlug */
export const getCoupon = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params as { idOrSlug: string };

  const coupon = await CouponModel.findOne(
    isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() }
  )
    .populate("store", STORE_CARD_FIELDS)
    .populate("categories", "name slug icon color")
    .lean();

  if (!coupon) throw ApiError.notFound("That offer is no longer listed");

  // Views are a vanity metric — never let one block the response.
  void CouponModel.updateOne({ _id: coupon._id }, { $inc: { views: 1 } }).catch(
    () => undefined
  );

  sendOk(res, decorateCoupon(coupon, { includeCode: Boolean(req.admin) }));
});

/** GET /api/coupons/:idOrSlug/related — more offers from the same store. */
export const getRelated = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params as { idOrSlug: string };

  const coupon = await CouponModel.findOne(
    isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() }
  )
    .select("_id store categories")
    .lean();

  if (!coupon) throw ApiError.notFound("That offer is no longer listed");

  const live = liveCouponFilter();

  const sameStore = await CouponModel.find({
    ...live,
    store: coupon.store,
    _id: { $ne: coupon._id },
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(6)
    .populate("store", STORE_CARD_FIELDS)
    .lean();

  // Fall back to the category only when the store has nothing else live.
  const sameCategory = sameStore.length
    ? []
    : await CouponModel.find({
        ...live,
        categories: { $in: coupon.categories ?? [] },
        _id: { $ne: coupon._id },
      })
        .sort({ priority: -1, createdAt: -1 })
        .limit(6)
        .populate("store", STORE_CARD_FIELDS)
        .lean();

  sendOk(res, decorateCoupons(sameStore.length ? sameStore : sameCategory));
});

/* =========================================================
   SHOPPER ACTIONS
========================================================= */

/**
 * POST /api/coupons/:id/reveal
 *
 * The shopper clicked "Get code". Hand back the code and the deal link, and
 * count the reveal — that number is the "used 2,431 times" line on the card.
 */
export const revealCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const coupon = await CouponModel.findById(id)
    .populate("store", STORE_CARD_FIELDS)
    .lean();

  if (!coupon) throw ApiError.notFound("That offer is no longer listed");

  if (coupon.status !== "active") {
    throw ApiError.badRequest("This offer has ended");
  }

  const store = coupon.store as unknown as {
    _id: unknown;
    name?: string;
    affiliateUrl?: string;
    websiteUrl?: string;
    trackingParams?: string;
  } | null;

  const destinationUrl = resolveDestination(coupon as never, store as never);

  void recordClick({
    req,
    kind: "reveal",
    storeId: store?._id,
    couponId: coupon._id,
    destinationUrl,
  });

  sendOk(res, {
    id: String(coupon._id),
    code: CODE_BEARING_TYPES.includes(coupon.type) ? coupon.code ?? null : null,
    type: coupon.type,
    url: destinationUrl,
    storeName: store?.name ?? "",
    uses: (coupon.uses ?? 0) + 1,
    expiresAt: coupon.expiresAt ?? null,
  });
});

/**
 * GET /api/coupons/:id/go
 *
 * The deal link for offers with no code. Redirects rather than returning
 * JSON so the browser carries a real referrer to the merchant, which some
 * affiliate networks require for attribution.
 */
export const goToDeal = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const coupon = await CouponModel.findById(id)
    .populate("store", STORE_CARD_FIELDS)
    .lean();

  if (!coupon) throw ApiError.notFound("That offer is no longer listed");

  const store = coupon.store as unknown as {
    _id: unknown;
    affiliateUrl?: string;
    websiteUrl?: string;
    trackingParams?: string;
  } | null;

  const destinationUrl = resolveDestination(coupon as never, store as never);

  if (!destinationUrl) {
    throw ApiError.badRequest("This offer has no link attached");
  }

  void recordClick({
    req,
    kind: "deal",
    storeId: store?._id,
    couponId: coupon._id,
    destinationUrl,
  });

  res.redirect(302, destinationUrl);
});

/** POST /api/coupons/:id/vote — `{ worked: boolean }` */
export const voteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { worked } = req.body as { worked: boolean };

  const coupon = await CouponModel.findByIdAndUpdate(
    id,
    { $inc: worked ? { successVotes: 1 } : { failVotes: 1 } },
    { new: true }
  )
    .select("successVotes failVotes")
    .lean();

  if (!coupon) throw ApiError.notFound("That offer is no longer listed");

  sendOk(res, {
    successVotes: coupon.successVotes,
    failVotes: coupon.failVotes,
    successRate: successRate(coupon),
  });
});

/* =========================================================
   ADMIN WRITES
========================================================= */

export const createCoupon = asyncHandler(async (req, res) => {
  const body = req.body as CreateCouponBody;

  const store = await StoreModel.findById(body.store).select("_id").lean();
  if (!store) throw ApiError.badRequest("That store does not exist");

  const patch = buildCouponPatch(body);
  patch.slug = await uniqueSlug(CouponModel, body.slug || body.title);
  patch.source = "manual";

  if (body.tagNames?.length) {
    patch.tags = await resolveTagNames(body.tagNames);
  }

  const coupon = await CouponModel.create(patch);

  await refreshStoreCounts(coupon.store);
  void refreshCategoryCounts();

  sendCreated(res, coupon.toJSON(), "Coupon created");
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateCouponBody;

  const before = await CouponModel.findById(id).select("store").lean();
  if (!before) throw ApiError.notFound("Coupon not found");

  const patch = buildCouponPatch(body);

  if (body.slug) {
    patch.slug = await uniqueSlug(CouponModel, body.slug, id);
  }

  if (body.tagNames !== undefined) {
    patch.tags = await resolveTagNames(body.tagNames ?? []);
  }

  const coupon = await CouponModel.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true, runValidators: true }
  );

  if (!coupon) throw ApiError.notFound("Coupon not found");

  // A coupon moved between stores changes the count at both ends.
  await refreshStoreCounts(coupon.store);
  if (idOf(before.store) !== idOf(coupon.store)) {
    await refreshStoreCounts(before.store);
  }
  void refreshCategoryCounts();

  sendOk(res, coupon.toJSON(), { message: "Coupon updated" });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const coupon = await CouponModel.findByIdAndDelete(id);
  if (!coupon) throw ApiError.notFound("Coupon not found");

  await refreshStoreCounts(coupon.store);
  void refreshCategoryCounts();

  sendOk(res, { id }, { message: "Coupon deleted" });
});

/** PATCH /api/coupons/:id/status */
export const changeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: string };

  const coupon = await CouponModel.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true }
  );

  if (!coupon) throw ApiError.notFound("Coupon not found");

  await refreshStoreCounts(coupon.store);

  sendOk(res, coupon.toJSON(), { message: `Coupon is now ${status}` });
});

/** POST /api/coupons/bulk/status */
export const bulkStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body as BulkStatusBody;

  const stores = await CouponModel.distinct("store", { _id: { $in: ids } });

  const result = await CouponModel.updateMany(
    { _id: { $in: ids } },
    { $set: { status } }
  );

  await refreshManyStoreCounts(stores);

  sendOk(res, { updated: result.modifiedCount }, {
    message: `${result.modifiedCount} coupons are now ${status}`,
  });
});

/** POST /api/coupons/bulk/delete */
export const bulkDelete = asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: string[] };

  const stores = await CouponModel.distinct("store", { _id: { $in: ids } });
  const result = await CouponModel.deleteMany({ _id: { $in: ids } });

  await refreshManyStoreCounts(stores);
  void refreshCategoryCounts();

  sendOk(res, { deleted: result.deletedCount }, {
    message: `${result.deletedCount} coupons deleted`,
  });
});

/** POST /api/coupons/:id/verify — marks an offer as checked today. */
export const verifyCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const coupon = await CouponModel.findByIdAndUpdate(
    id,
    { $set: { verified: true, verifiedAt: new Date(), lastCheckedAt: new Date() } },
    { new: true }
  );

  if (!coupon) throw ApiError.notFound("Coupon not found");

  sendOk(res, coupon.toJSON(), { message: "Marked as verified" });
});
