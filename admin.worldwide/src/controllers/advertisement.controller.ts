import {
  AdvertisementModel,
  AD_POSITIONS,
  type AdDevice,
} from "../models/Advertisement.js";
import { normalizeImage } from "../models/shared/image.schema.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idsOf, isObjectId } from "../utils/objectId.js";
import { sendCreated, sendOk } from "../utils/response.js";
import { sanitizePlain } from "../utils/sanitize.js";
import { normalizeUrl } from "../utils/url.js";

/**
 * GET /api/ads/serve?position=&device=
 *
 * Returns the single best ad for a slot, already filtered by schedule and
 * device, so the frontend never has to reason about targeting.
 */
export const serveAd = asyncHandler(async (req, res) => {
  const position = String(req.query.position ?? "");
  const device = String(req.query.device ?? "desktop") as AdDevice;
  const category = String(req.query.category ?? "");
  const store = String(req.query.store ?? "");

  if (!AD_POSITIONS.includes(position as never)) {
    throw ApiError.badRequest("Unknown ad position");
  }

  const now = new Date();

  const filter: Record<string, unknown> = {
    position,
    status: "active",
    devices: device,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };

  // A targeted ad should win its slot; an untargeted one is the house default.
  if (isObjectId(category)) {
    filter.$or = [{ categories: { $size: 0 } }, { categories: category }];
  }
  if (isObjectId(store)) {
    filter.stores = { $in: [[], store] };
  }

  const ad = await AdvertisementModel.findOne(filter)
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  if (!ad) return sendOk(res, null);

  void AdvertisementModel.updateOne(
    { _id: ad._id },
    { $inc: { impressions: 1 } }
  ).catch(() => undefined);

  sendOk(res, ad);
});

/** POST /api/ads/:id/click */
export const trackAdClick = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const ad = await AdvertisementModel.findByIdAndUpdate(
    id,
    { $inc: { clicks: 1 } },
    { new: true }
  )
    .select("targetUrl")
    .lean();

  if (!ad) throw ApiError.notFound("Ad not found");

  sendOk(res, { url: ad.targetUrl ?? null });
});

/* ---------------- admin ---------------- */

export const listAds = asyncHandler(async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.position && req.query.position !== "all") {
    filter.position = String(req.query.position);
  }
  if (req.query.status && req.query.status !== "all") {
    filter.status = String(req.query.status);
  }

  const ads = await AdvertisementModel.find(filter)
    .sort({ position: 1, priority: -1 })
    .lean();

  sendOk(res, ads, { meta: { positions: AD_POSITIONS } });
});

function buildAdPatch(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) patch.name = sanitizePlain(body.name);
  if (body.position !== undefined) patch.position = body.position;
  if (body.type !== undefined) patch.type = body.type === "script" ? "script" : "image";
  if (body.image !== undefined) patch.image = normalizeImage(body.image);

  // Script ads are raw third-party HTML by design; sanitising them would strip
  // the very <script> tag that makes them work. Only a trusted admin can
  // reach this endpoint, which is what makes that acceptable.
  if (body.scriptCode !== undefined) patch.scriptCode = String(body.scriptCode);

  if (body.targetUrl !== undefined) {
    patch.targetUrl = normalizeUrl(body.targetUrl) ?? undefined;
  }
  if (body.openInNewTab !== undefined) patch.openInNewTab = Boolean(body.openInNewTab);
  if (body.categories !== undefined) patch.categories = idsOf(body.categories);
  if (body.stores !== undefined) patch.stores = idsOf(body.stores);
  if (Array.isArray(body.devices)) patch.devices = body.devices;
  if (body.priority !== undefined) patch.priority = Number(body.priority) || 0;
  if (body.status !== undefined) patch.status = body.status === "paused" ? "paused" : "active";

  for (const key of ["startsAt", "endsAt"] as const) {
    if (body[key] !== undefined) {
      patch[key] = body[key] ? new Date(String(body[key])) : null;
    }
  }

  return patch;
}

export const createAd = asyncHandler(async (req, res) => {
  const patch = buildAdPatch(req.body as Record<string, unknown>);

  if (!patch.name) throw ApiError.badRequest("Ad name is required");
  if (!AD_POSITIONS.includes(patch.position as never)) {
    throw ApiError.badRequest("Pick a valid position");
  }

  const ad = await AdvertisementModel.create(patch);
  sendCreated(res, ad.toJSON(), "Ad created");
});

export const updateAd = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const ad = await AdvertisementModel.findByIdAndUpdate(
    id,
    { $set: buildAdPatch(req.body as Record<string, unknown>) },
    { new: true, runValidators: true }
  );

  if (!ad) throw ApiError.notFound("Ad not found");

  sendOk(res, ad.toJSON(), { message: "Ad updated" });
});

export const deleteAd = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const ad = await AdvertisementModel.findByIdAndDelete(id);
  if (!ad) throw ApiError.notFound("Ad not found");

  sendOk(res, { id }, { message: "Ad deleted" });
});
