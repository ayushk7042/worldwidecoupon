import { CouponModel } from "../models/Coupon.js";
import { TagModel } from "../models/Tag.js";
import { STORE_CARD_FIELDS } from "../services/coupon.service.js";
import { liveCouponFilter } from "../services/counters.service.js";
import { decorateCoupons } from "../services/couponView.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isObjectId } from "../utils/objectId.js";
import { buildPagination, sendCreated, sendOk } from "../utils/response.js";
import { sanitizePlain } from "../utils/sanitize.js";
import { uniqueSlug } from "../utils/slug.js";

/** GET /api/tags */
export const listTags = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const search = String(req.query.search ?? "").trim();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.name = {
      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }
  if (req.query.featured === "true") filter.featured = true;

  const [items, total] = await Promise.all([
    TagModel.find(filter)
      .sort({ couponCount: -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TagModel.countDocuments(filter),
  ]);

  sendOk(res, items, {
    pagination: buildPagination(page, limit, total, items.length),
  });
});

/** GET /api/tags/:idOrSlug */
export const getTag = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params as { idOrSlug: string };

  const tag = await TagModel.findOne(
    isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() }
  ).lean();

  if (!tag) throw ApiError.notFound("Tag not found");

  const coupons = await CouponModel.find({ tags: tag._id, ...liveCouponFilter() })
    .sort({ priority: -1, createdAt: -1 })
    .limit(40)
    .populate("store", STORE_CARD_FIELDS)
    .lean();

  sendOk(res, { ...tag, coupons: decorateCoupons(coupons) });
});

export const createTag = asyncHandler(async (req, res) => {
  const name = sanitizePlain((req.body as { name?: string }).name);
  if (!name) throw ApiError.badRequest("Tag name is required");

  const slug = await uniqueSlug(TagModel, name);
  const tag = await TagModel.create({
    name,
    slug,
    description: sanitizePlain((req.body as { description?: string }).description),
    color: sanitizePlain((req.body as { color?: string }).color),
  });

  sendCreated(res, tag.toJSON(), "Tag created");
});

export const updateTag = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const body = req.body as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  for (const key of ["name", "description", "color"] as const) {
    if (body[key] !== undefined) patch[key] = sanitizePlain(body[key]);
  }
  if (body.featured !== undefined) patch.featured = Boolean(body.featured);
  if (body.slug) patch.slug = await uniqueSlug(TagModel, String(body.slug), id);

  const tag = await TagModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!tag) throw ApiError.notFound("Tag not found");

  sendOk(res, tag.toJSON(), { message: "Tag updated" });
});

/**
 * DELETE /api/tags/:id
 *
 * Pulls the reference out of every coupon first; unlike a category, a tag is
 * a loose label, so removing it from coupons loses nothing an editor cares
 * about and leaving dangling ids would break the tag page.
 */
export const deleteTag = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const tag = await TagModel.findByIdAndDelete(id);
  if (!tag) throw ApiError.notFound("Tag not found");

  await CouponModel.updateMany({ tags: id }, { $pull: { tags: id } });

  sendOk(res, { id }, { message: "Tag deleted" });
});

/** POST /api/tags/refresh-counts */
export const refreshTagCounts = asyncHandler(async (_req, res) => {
  const tags = await TagModel.find().select("_id").lean();

  for (const tag of tags) {
    const count = await CouponModel.countDocuments({ tags: tag._id });
    await TagModel.updateOne({ _id: tag._id }, { $set: { couponCount: count } });
  }

  sendOk(res, { updated: tags.length }, { message: "Tag counters refreshed" });
});
