import type { FilterQuery } from "mongoose";
import { CategoryModel, type Category } from "../models/Category.js";
import { CouponModel } from "../models/Coupon.js";
import { normalizeImage } from "../models/shared/image.schema.js";
import { StoreModel } from "../models/Store.js";
import { STORE_CARD_FIELDS } from "../services/coupon.service.js";
import {
  liveCouponFilter,
  refreshCategoryCounts,
} from "../services/counters.service.js";
import { decorateCoupons } from "../services/couponView.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idOf, isObjectId } from "../utils/objectId.js";
import { sendCreated, sendOk } from "../utils/response.js";
import { sanitizePlain, sanitizeRich } from "../utils/sanitize.js";
import { uniqueSlug } from "../utils/slug.js";
import { normalizeUrl } from "../utils/url.js";
import type {
  CreateCategoryBody,
  ListCategoriesQuery,
  UpdateCategoryBody,
} from "../validators/category.validator.js";

type CategoryPatch = Partial<Record<keyof Category, unknown>>;

const PASS_THROUGH = [
  "order",
  "priority",
  "featured",
  "showOnHome",
  "showInMenu",
  "showInFooter",
  "hidden",
  "status",
] as const;

function buildCategoryPatch(body: CreateCategoryBody | UpdateCategoryBody): CategoryPatch {
  const patch: CategoryPatch = {};
  const source = body as Record<string, unknown>;

  for (const key of PASS_THROUGH) {
    if (source[key] !== undefined) patch[key as keyof Category] = source[key];
  }

  if (source.name !== undefined) patch.name = sanitizePlain(source.name);
  if (source.description !== undefined) {
    patch.description = sanitizeRich(source.description);
  }

  for (const key of ["icon", "shortLabel", "color", "metaTitle", "metaDescription", "focusKeyword", "robots"] as const) {
    if (source[key] !== undefined) patch[key] = sanitizePlain(source[key]);
  }

  for (const key of ["image", "banner", "headerImage", "ogImage"] as const) {
    if (source[key] !== undefined) patch[key] = normalizeImage(source[key]);
  }

  if (source.parent !== undefined) {
    patch.parent = isObjectId(source.parent) ? source.parent : null;
  }

  for (const key of ["redirectUrl", "canonicalUrl"] as const) {
    if (source[key] !== undefined) patch[key] = normalizeUrl(source[key]) ?? undefined;
  }

  return patch;
}

/** Nests children under parents in one pass, preserving each level's order. */
function toTree(categories: (Category & { _id: unknown })[]) {
  type Node = Category & { _id: unknown; children: Node[] };

  const nodes = new Map<string, Node>();
  const roots: Node[] = [];

  for (const category of categories) {
    nodes.set(String(category._id), { ...category, children: [] } as Node);
  }

  for (const node of nodes.values()) {
    const parentId = idOf(node.parent);
    const parent = parentId ? nodes.get(parentId) : null;

    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

/* =========================================================
   READS
========================================================= */

/** GET /api/categories */
export const listCategories = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListCategoriesQuery;

  const filter: FilterQuery<Category> = {};

  if (query.status !== "all") filter.status = query.status;
  if (!query.includeHidden) filter.hidden = { $ne: true };

  if (query.featured) filter.featured = true;
  if (query.showOnHome) filter.showOnHome = true;
  if (query.showInMenu) filter.showInMenu = true;

  if (query.parent === "root") filter.parent = null;
  else if (query.parent !== "all") filter.parent = query.parent;

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = { $regex: escaped, $options: "i" };
  }

  const categories = await CategoryModel.find(filter)
    .sort({ priority: -1, order: 1, name: 1 })
    .limit(query.limit)
    .lean();

  // A tree built from a filtered set would silently drop children whose
  // parent was excluded, so the shape is only applied to an unfiltered read.
  const data =
    query.shape === "tree" && query.parent === "all"
      ? toTree(categories as never)
      : categories;

  sendOk(res, data, { meta: { total: categories.length } });
});

/** GET /api/categories/menu — the trimmed payload the nav actually needs. */
export const getMenu = asyncHandler(async (_req, res) => {
  const categories = await CategoryModel.find({
    status: "active",
    hidden: { $ne: true },
    showInMenu: true,
  })
    .sort({ priority: -1, order: 1, name: 1 })
    .select("name slug icon color shortLabel parent activeCouponCount")
    .lean();

  sendOk(res, toTree(categories as never));
});

/** GET /api/categories/:idOrSlug — the category page. */
export const getCategory = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params as { idOrSlug: string };

  const category = await CategoryModel.findOne(
    isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() }
  ).lean();

  if (!category) throw ApiError.notFound("That category does not exist");

  const [children, stores, coupons] = await Promise.all([
    CategoryModel.find({ parent: category._id, status: "active" })
      .sort({ order: 1, name: 1 })
      .select("name slug icon color activeCouponCount")
      .lean(),

    StoreModel.find({ categories: category._id, status: "active" })
      .sort({ activeCouponCount: -1, name: 1 })
      .limit(24)
      .select("name slug logo brandColor activeCouponCount bestOffer")
      .lean(),

    CouponModel.find({ categories: category._id, ...liveCouponFilter() })
      .sort({ priority: -1, verified: -1, createdAt: -1 })
      .limit(24)
      .populate("store", STORE_CARD_FIELDS)
      .lean(),
  ]);

  sendOk(res, {
    ...category,
    children,
    stores,
    coupons: decorateCoupons(coupons),
  });
});

/* =========================================================
   ADMIN WRITES
========================================================= */

export const createCategory = asyncHandler(async (req, res) => {
  const body = req.body as CreateCategoryBody;

  const patch = buildCategoryPatch(body);
  patch.slug = await uniqueSlug(CategoryModel, body.slug || body.name);

  const category = await CategoryModel.create(patch);

  sendCreated(res, category.toJSON(), "Category created");
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateCategoryBody;

  // A category that is its own parent makes the tree builder loop forever.
  if (body.parent && idOf(body.parent) === id) {
    throw ApiError.badRequest("A category cannot be its own parent");
  }

  const patch = buildCategoryPatch(body);
  if (body.slug) patch.slug = await uniqueSlug(CategoryModel, body.slug, id);

  const category = await CategoryModel.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true, runValidators: true }
  );

  if (!category) throw ApiError.notFound("Category not found");

  sendOk(res, category.toJSON(), { message: "Category updated" });
});

/**
 * DELETE /api/categories/:id
 *
 * Refuses while anything still points at it. Cascading would quietly strip the
 * category from hundreds of coupons, and that is not recoverable from the UI.
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const [children, storeCount, couponCount] = await Promise.all([
    CategoryModel.countDocuments({ parent: id }),
    StoreModel.countDocuments({ categories: id }),
    CouponModel.countDocuments({ categories: id }),
  ]);

  if (children) {
    throw ApiError.conflict(
      `Move or delete the ${children} sub-categories first`
    );
  }

  if (storeCount || couponCount) {
    throw ApiError.conflict(
      `${storeCount} stores and ${couponCount} coupons still use this category`
    );
  }

  const category = await CategoryModel.findByIdAndDelete(id);
  if (!category) throw ApiError.notFound("Category not found");

  sendOk(res, { id }, { message: "Category deleted" });
});

/** POST /api/categories/reorder */
export const reorderCategories = asyncHandler(async (req, res) => {
  const { items } = req.body as { items: { id: string; order: number }[] };

  await CategoryModel.bulkWrite(
    items.map(({ id, order }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order } } },
    }))
  );

  sendOk(res, { updated: items.length }, { message: "Order saved" });
});

/** POST /api/categories/refresh-counts */
export const refreshCounts = asyncHandler(async (_req, res) => {
  await refreshCategoryCounts();
  sendOk(res, { ok: true }, { message: "Category counters refreshed" });
});
