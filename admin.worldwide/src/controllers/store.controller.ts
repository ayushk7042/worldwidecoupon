import { CouponModel } from "../models/Coupon.js";
import { StoreModel } from "../models/Store.js";
import { recordClick } from "../services/click.service.js";
import { STORE_CARD_FIELDS } from "../services/coupon.service.js";
import {
  liveCouponFilter,
  refreshCategoryCounts,
  refreshStoreCounts,
} from "../services/counters.service.js";
import { decorateCoupons } from "../services/couponView.service.js";
import { buildStoreFilter, buildStorePatch, STORE_SORTERS } from "../services/store.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isObjectId } from "../utils/objectId.js";
import { buildPagination, sendCreated, sendOk } from "../utils/response.js";
import { uniqueSlug } from "../utils/slug.js";
import { logoForDomain } from "../utils/url.js";
import type {
  CreateStoreBody,
  ListStoresQuery,
  UpdateStoreBody,
} from "../validators/store.validator.js";

/* =========================================================
   READS
========================================================= */

/** GET /api/stores */
export const listStores = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListStoresQuery;

  const filter = await buildStoreFilter(query);

  if (!filter) {
    return sendOk(res, [], {
      pagination: buildPagination(query.page, query.limit, 0, 0),
    });
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    StoreModel.find(filter)
      .sort(STORE_SORTERS[query.sort] ?? STORE_SORTERS.popular!)
      .skip(skip)
      .limit(query.limit)
      .populate("primaryCategory", "name slug icon")
      .select("-about -faqs -schemaMarkup")
      .lean(),
    StoreModel.countDocuments(filter),
  ]);

  sendOk(res, items, {
    pagination: buildPagination(query.page, query.limit, total, items.length),
  });
});

/** GET /api/stores/letters — how many stores sit under each initial. */
export const getLetterCounts = asyncHandler(async (_req, res) => {
  const rows = await StoreModel.aggregate<{ _id: string; count: number }>([
    { $match: { status: "active" } },
    {
      $group: {
        _id: { $toUpper: { $substrCP: ["$name", 0, 1] } },
        count: { $sum: 1 },
      },
    },
  ]);

  const counts: Record<string, number> = {};

  for (const row of rows) {
    const key = /^[A-Z]$/.test(row._id) ? row._id : "#";
    counts[key] = (counts[key] ?? 0) + row.count;
  }

  sendOk(res, counts);
});

/** GET /api/stores/directory — the full A–Z index, grouped, for the browse page. */
export const getDirectory = asyncHandler(async (_req, res) => {
  const stores = await StoreModel.find({ status: "active" })
    .sort({ name: 1 })
    .select("name slug logo activeCouponCount")
    .lean();

  const groups: Record<string, typeof stores> = {};

  for (const store of stores) {
    const initial = store.name.charAt(0).toUpperCase();
    const key = /^[A-Z]$/.test(initial) ? initial : "#";
    (groups[key] ??= []).push(store);
  }

  sendOk(res, groups, { meta: { total: stores.length } });
});

/** GET /api/stores/:idOrSlug — the store page: details plus its live offers. */
export const getStore = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params as { idOrSlug: string };

  const store = await StoreModel.findOne(
    isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() }
  )
    .populate("categories", "name slug icon color")
    .populate("primaryCategory", "name slug icon color")
    .lean();

  if (!store) throw ApiError.notFound("We do not list that store yet");

  const [active, expired] = await Promise.all([
    CouponModel.find({ store: store._id, ...liveCouponFilter() })
      .sort({ priority: -1, verified: -1, discountValue: -1, createdAt: -1 })
      .populate("categories", "name slug")
      .lean(),

    CouponModel.find({ store: store._id, status: "expired" })
      .sort({ expiresAt: -1 })
      .limit(10)
      .lean(),
  ]);

  void StoreModel.updateOne({ _id: store._id }, { $inc: { views: 1 } }).catch(
    () => undefined
  );

  const includeCode = Boolean(req.admin);

  sendOk(res, {
    ...store,
    // A store imported without artwork still needs something to render.
    logo: store.logo ?? (store.domain ? { url: logoForDomain(store.domain) } : null),
    coupons: decorateCoupons(active, { includeCode }),
    expiredCoupons: decorateCoupons(expired),
    stats: {
      total: active.length,
      codes: active.filter((coupon) => Boolean(coupon.code)).length,
      deals: active.filter((coupon) => !coupon.code).length,
    },
  });
});

/**
 * GET /api/stores/:id/go
 *
 * Outbound redirect for the store-level "Visit site" button, counted the same
 * way a deal click is so the reports line up.
 */
export const goToStore = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const store = await StoreModel.findById(id)
    .select("affiliateUrl websiteUrl trackingParams")
    .lean();

  if (!store) throw ApiError.notFound("Store not found");

  const destinationUrl = new StoreModel(store).outboundUrl();

  if (!destinationUrl) throw ApiError.badRequest("This store has no link attached");

  void recordClick({ req, kind: "store", storeId: store._id, destinationUrl });

  res.redirect(302, destinationUrl);
});

/** POST /api/stores/:id/click — the JSON variant, for a fetch-then-open frontend. */
export const trackStoreClick = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const store = await StoreModel.findById(id)
    .select("affiliateUrl websiteUrl trackingParams name")
    .lean();

  if (!store) throw ApiError.notFound("Store not found");

  const destinationUrl = new StoreModel(store).outboundUrl();

  void recordClick({ req, kind: "store", storeId: store._id, destinationUrl });

  sendOk(res, { url: destinationUrl, storeName: store.name });
});

/* =========================================================
   ADMIN WRITES
========================================================= */

export const createStore = asyncHandler(async (req, res) => {
  const body = req.body as CreateStoreBody;

  const patch = buildStorePatch(body);
  patch.slug = await uniqueSlug(StoreModel, body.slug || body.name);

  if (!patch.logo && patch.domain) {
    patch.logo = { url: logoForDomain(String(patch.domain)) };
  }

  const store = await StoreModel.create(patch);
  void refreshCategoryCounts();

  sendCreated(res, store.toJSON(), "Store created");
});

export const updateStore = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateStoreBody;

  const patch = buildStorePatch(body);

  if (body.slug) patch.slug = await uniqueSlug(StoreModel, body.slug, id);

  const store = await StoreModel.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true, runValidators: true }
  );

  if (!store) throw ApiError.notFound("Store not found");

  void refreshCategoryCounts();

  sendOk(res, store.toJSON(), { message: "Store updated" });
});

/**
 * DELETE /api/stores/:id
 *
 * Coupons go with it. An offer whose store is gone is unreachable — no page
 * to show it on and no link to send the shopper to — so leaving orphans
 * behind would only pollute the counters.
 */
export const deleteStore = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const store = await StoreModel.findByIdAndDelete(id);
  if (!store) throw ApiError.notFound("Store not found");

  const { deletedCount } = await CouponModel.deleteMany({ store: store._id });
  void refreshCategoryCounts();

  sendOk(res, { id, couponsDeleted: deletedCount }, {
    message: `Store and ${deletedCount} offers deleted`,
  });
});

/** POST /api/stores/:id/refresh — recomputes the denormalised counters. */
export const refreshStore = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  await refreshStoreCounts(id);

  const store = await StoreModel.findById(id)
    .select("couponCount activeCouponCount codeCount dealCount bestOffer")
    .lean();

  if (!store) throw ApiError.notFound("Store not found");

  sendOk(res, store, { message: "Counters refreshed" });
});

/** POST /api/stores/bulk/status */
export const bulkStoreStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body as { ids: string[]; status: string };

  const result = await StoreModel.updateMany(
    { _id: { $in: ids } },
    { $set: { status } }
  );

  void refreshCategoryCounts();

  sendOk(res, { updated: result.modifiedCount }, {
    message: `${result.modifiedCount} stores are now ${status}`,
  });
});
