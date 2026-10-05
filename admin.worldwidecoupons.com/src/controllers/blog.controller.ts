import { BlogModel } from "../models/Blog.js";
import { CategoryModel } from "../models/Category.js";
import { normalizeImage } from "../models/shared/image.schema.js";
import { StoreModel } from "../models/Store.js";
import { TagModel } from "../models/Tag.js";
import { STORE_CARD_FIELDS, resolveTagNames } from "../services/coupon.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isObjectId } from "../utils/objectId.js";
import { buildPagination, sendCreated, sendOk } from "../utils/response.js";
import { sanitizePlain, sanitizeRich } from "../utils/sanitize.js";
import { uniqueSlug } from "../utils/slug.js";
import type { CreateBlogBody, ListBlogQuery, UpdateBlogBody } from "../validators/blog.validator.js";

const CATEGORY_FIELDS = "name slug icon color";

const SORTERS: Record<string, Record<string, 1 | -1>> = {
  newest: { publishedAt: -1, createdAt: -1 },
  oldest: { publishedAt: 1, createdAt: 1 },
  popular: { views: -1, publishedAt: -1 },
};

/* =========================================================
   READS
========================================================= */

/** GET /api/blog — the public listing, and the admin table behind it. */
export const listBlogPosts = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListBlogQuery;
  const isAdmin = Boolean(req.admin);

  const filter: Record<string, unknown> = {};

  // A shopper only ever sees published posts; an editor can filter by any
  // status (or all of them) to find drafts and archived posts too.
  if (isAdmin && query.status && query.status !== "all") {
    filter.status = query.status;
  } else if (!isAdmin) {
    filter.status = "published";
  }

  if (query.store) {
    filter.store = isObjectId(query.store) ? query.store : await storeIdFromSlug(query.store);
    if (!filter.store) {
      return sendOk(res, [], { pagination: buildPagination(query.page, query.limit, 0, 0) });
    }
  }

  if (query.category) {
    const categoryId = isObjectId(query.category)
      ? query.category
      : await categoryIdFromSlug(query.category);
    if (!categoryId) {
      return sendOk(res, [], { pagination: buildPagination(query.page, query.limit, 0, 0) });
    }
    filter.categories = categoryId;
  }

  if (query.tag) {
    const tagId = isObjectId(query.tag) ? query.tag : await tagIdFromSlug(query.tag);
    if (!tagId) {
      return sendOk(res, [], { pagination: buildPagination(query.page, query.limit, 0, 0) });
    }
    filter.tags = tagId;
  }

  if (query.featured !== undefined) filter.featured = query.featured;

  if (query.search) {
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ title: { $regex: safe, $options: "i" } }, { excerpt: { $regex: safe, $options: "i" } }];
  }

  const skip = (query.page - 1) * query.limit;

  const listQuery = BlogModel.find(filter)
    .sort(SORTERS[query.sort] ?? SORTERS.newest)
    .skip(skip)
    .limit(query.limit)
    .populate("store", STORE_CARD_FIELDS)
    .populate("categories", CATEGORY_FIELDS);

  // The listing card never shows the full body — leaving it out of a public
  // (non-admin) response keeps the payload light.
  if (!isAdmin) listQuery.select("-body");

  const [items, total] = await Promise.all([
    listQuery.lean(),
    BlogModel.countDocuments(filter),
  ]);

  sendOk(res, items, {
    pagination: buildPagination(query.page, query.limit, total, items.length),
  });
});

/** GET /api/blog/:idOrSlug */
export const getBlogPost = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params as { idOrSlug: string };
  const isAdmin = Boolean(req.admin);

  const post = await BlogModel.findOne(
    isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() }
  )
    .populate("store", STORE_CARD_FIELDS)
    .populate("categories", CATEGORY_FIELDS);

  if (!post || (post.status !== "published" && !isAdmin)) {
    throw ApiError.notFound("That post is no longer here");
  }

  // Fire-and-forget: a view count is a nicety, never worth blocking the
  // response or risking a write conflict with the editor's own save.
  if (!isAdmin) void BlogModel.updateOne({ _id: post._id }, { $inc: { views: 1 } });

  const [previous, next] = await Promise.all([
    BlogModel.findOne({ status: "published", publishedAt: { $lt: post.publishedAt ?? post.createdAt } })
      .sort({ publishedAt: -1 })
      .select("title slug image")
      .lean(),
    BlogModel.findOne({ status: "published", publishedAt: { $gt: post.publishedAt ?? post.createdAt } })
      .sort({ publishedAt: 1 })
      .select("title slug image")
      .lean(),
  ]);

  sendOk(res, { ...post.toJSON(), previous: previous ?? null, next: next ?? null });
});

/* =========================================================
   WRITES
========================================================= */

export const createBlogPost = asyncHandler(async (req, res) => {
  const body = req.body as CreateBlogBody;

  const slug = await uniqueSlug(BlogModel, body.slug || body.title);
  const tags = await resolveTagNames(body.tagNames ?? []);

  const post = await BlogModel.create({
    title: sanitizePlain(body.title),
    slug,
    excerpt: body.excerpt ? sanitizePlain(body.excerpt) : undefined,
    body: sanitizeRich(body.body),

    image: normalizeImage(body.image),
    imageLink: body.imageLink,

    store: body.store || null,
    categories: body.categories ?? [],
    tags,
    tagNames: body.tagNames ?? [],

    authorName: body.authorName ? sanitizePlain(body.authorName) : req.admin?.name,
    author: req.admin?._id ?? null,

    status: body.status ?? "draft",
    featured: Boolean(body.featured),

    metaTitle: body.metaTitle,
    metaDescription: body.metaDescription,
    canonicalUrl: body.canonicalUrl,
  });

  sendCreated(res, post.toJSON(), "Post created");
});

export const updateBlogPost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateBlogBody;

  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) patch.title = sanitizePlain(body.title);
  if (body.slug) patch.slug = await uniqueSlug(BlogModel, body.slug, id);
  if (body.excerpt !== undefined) patch.excerpt = sanitizePlain(body.excerpt);
  if (body.body !== undefined) patch.body = sanitizeRich(body.body);

  if (body.image !== undefined) patch.image = normalizeImage(body.image);
  if (body.imageLink !== undefined) patch.imageLink = body.imageLink;

  if (body.store !== undefined) patch.store = body.store || null;
  if (body.categories !== undefined) patch.categories = body.categories;
  if (body.tagNames !== undefined) {
    patch.tagNames = body.tagNames;
    patch.tags = await resolveTagNames(body.tagNames);
  }

  if (body.authorName !== undefined) patch.authorName = sanitizePlain(body.authorName);
  if (body.status !== undefined) patch.status = body.status;
  if (body.featured !== undefined) patch.featured = body.featured;

  if (body.metaTitle !== undefined) patch.metaTitle = body.metaTitle;
  if (body.metaDescription !== undefined) patch.metaDescription = body.metaDescription;
  if (body.canonicalUrl !== undefined) patch.canonicalUrl = body.canonicalUrl;

  // `.save()`, not `findByIdAndUpdate`, so the `pre("save")` publish-date
  // hook actually runs when status flips to "published" here.
  const post = await BlogModel.findById(id);
  if (!post) throw ApiError.notFound("Post not found");

  post.set(patch);
  await post.save();

  sendOk(res, post.toJSON(), { message: "Post updated" });
});

export const changeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: "draft" | "published" | "archived" };

  const post = await BlogModel.findById(id);
  if (!post) throw ApiError.notFound("Post not found");

  post.status = status;
  await post.save();

  sendOk(res, post.toJSON(), { message: `Marked as ${status}` });
});

export const deleteBlogPost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const post = await BlogModel.findByIdAndDelete(id);
  if (!post) throw ApiError.notFound("Post not found");

  sendOk(res, { id }, { message: "Post deleted" });
});

export const bulkStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body as { ids: string[]; status: string };

  await BlogModel.updateMany({ _id: { $in: ids } }, { $set: { status } });
  // Bulk update bypasses the pre("save") hook, so a bulk-publish needs its
  // own pass to stamp publishedAt for any post that never had one.
  if (status === "published") {
    await BlogModel.updateMany(
      { _id: { $in: ids }, publishedAt: null },
      { $set: { publishedAt: new Date() } }
    );
  }

  sendOk(res, { updated: ids.length }, { message: `Marked ${ids.length} post(s) as ${status}` });
});

export const bulkDelete = asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: string[] };

  await BlogModel.deleteMany({ _id: { $in: ids } });

  sendOk(res, { deleted: ids.length }, { message: `Deleted ${ids.length} post(s)` });
});

/* =========================================================
   helpers
========================================================= */

async function storeIdFromSlug(slug: string): Promise<string | null> {
  const store = await StoreModel.findOne({ slug }).select("_id").lean();
  return store ? String(store._id) : null;
}

async function categoryIdFromSlug(slug: string): Promise<string | null> {
  const category = await CategoryModel.findOne({ slug }).select("_id").lean();
  return category ? String(category._id) : null;
}

async function tagIdFromSlug(slug: string): Promise<string | null> {
  const tag = await TagModel.findOne({ slug }).select("_id").lean();
  return tag ? String(tag._id) : null;
}
