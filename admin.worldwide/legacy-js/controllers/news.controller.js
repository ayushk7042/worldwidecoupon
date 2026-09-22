const mongoose = require("mongoose");
const News = require("../models/News");
const Category = require("../models/Category");
const {
  buildNewsPayload,
  refreshTagCounts,
} = require("../services/newsPayload.service");
const { uniqueSlug, makeSlug } = require("../utils/newsHelpers");

/* =========================================================
   CONSTANTS
========================================================= */

const PUBLIC_POPULATE = "category subCategory tags";
const LEGACY_DEFAULT_LIMIT = 200; // bare GET /api/news kept array-shaped, but bounded

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

/** A visitor may only see live content; an authenticated admin sees everything. */
const visibilityFilter = (req) => {
  if (req.admin) return { deletedAt: null };
  return {
    deletedAt: null,
    status: "published",
    $or: [{ publishedDate: { $lte: new Date() } }, { publishedDate: null }],
  };
};

/* =========================================================
   QUERY BUILDER
========================================================= */

/**
 * Translates the query string into a Mongo filter.
 * Supported: search, category, subCategory, tag, status, author, language,
 * country, region, featured, trending, popular, breaking, editorsPick,
 * dateFrom, dateTo.
 */
const buildFilter = async (req) => {
  const q = req.query;
  const filter = { ...visibilityFilter(req) };

  // status overrides the default visibility, but only for an admin
  if (q.status && q.status !== "all" && req.admin) {
    delete filter.$or;
    filter.status = q.status;
  }

  if (q.category && q.category !== "all") {
    const cat = isObjectId(q.category)
      ? { _id: q.category }
      : { slug: makeSlug(q.category) };
    const found = await Category.findOne(cat).select("_id").lean();
    // unmatched category must return nothing rather than everything
    filter.category = found ? found._id : new mongoose.Types.ObjectId();
  }

  if (q.subCategory && q.subCategory !== "all") {
    const found = isObjectId(q.subCategory)
      ? { _id: q.subCategory }
      : await Category.findOne({ slug: makeSlug(q.subCategory) }).select("_id").lean();
    filter.subCategory = found?._id || found || new mongoose.Types.ObjectId();
  }

  if (q.tag && q.tag !== "all") {
    if (isObjectId(q.tag)) filter.tags = q.tag;
    else filter.tagNames = new RegExp(`^${q.tag}$`, "i");
  }

  const flagMap = {
    featured: "featured",
    trending: "trending",
    popular: "popular",
    breaking: "breakingNews",
    breakingNews: "breakingNews",
    editorsPick: "editorsPick",
    isMainTrending: "isMainTrending",
    isSubTrending: "isSubTrending",
  };

  Object.entries(flagMap).forEach(([param, field]) => {
    if (q[param] !== undefined && q[param] !== "" && q[param] !== "all") {
      filter[field] = q[param] === "true" || q[param] === true;
    }
  });

  ["language", "country", "region", "destination"].forEach((key) => {
    if (q[key] && q[key] !== "all") filter[key] = q[key];
  });

  if (q.author) filter["author.name"] = new RegExp(q.author, "i");

  if (q.dateFrom || q.dateTo) {
    filter.publishedDate = {};
    if (q.dateFrom) filter.publishedDate.$gte = new Date(q.dateFrom);
    if (q.dateTo) {
      const to = new Date(q.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.publishedDate.$lte = to;
    }
    delete filter.$or; // an explicit range replaces the "not in the future" guard
  }

  if (q.search) {
    const rx = new RegExp(String(q.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const searchOr = [
      { title: rx },
      { subtitle: rx },
      { slug: rx },
      { description: rx },
      { contentText: rx },
      { tagNames: rx },
      { "author.name": rx },
      { sourceName: rx },
      { destination: rx },
    ];

    // combine with any existing $or without clobbering it
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  if (q.exclude && isObjectId(q.exclude)) {
    filter._id = { $ne: q.exclude };
  }

  return filter;
};

const buildSort = (sortParam) => {
  const map = {
    latest: { publishedDate: -1, createdAt: -1 },
    oldest: { publishedDate: 1 },
    popular: { views: -1 },
    trending: { views: -1, publishedDate: -1 },
    priority: { priority: -1, publishedDate: -1 },
    title: { title: 1 },
    updated: { updatedAt: -1 },
  };

  if (!sortParam) return map.latest;
  if (map[sortParam]) return map[sortParam];

  // raw mongo sort string, e.g. "-views"
  return sortParam;
};

/* =========================================================
   READ — LEGACY SHAPE (unchanged contract)
========================================================= */

/**
 * GET /api/news
 * Legacy endpoint. Still returns a bare array so existing clients keep working.
 * Bounded to 200 documents by default; pass ?limit= or ?all=true to change.
 */
exports.getNews = async (req, res) => {
  try {
    const all = req.query.all === "true";
    const limit = all
      ? 0
      : Math.min(2000, parseInt(req.query.limit, 10) || LEGACY_DEFAULT_LIMIT);

    let query = News.find({ deletedAt: null })
      .populate(PUBLIC_POPULATE)
      .sort({ createdAt: -1 })
      .select("-contentText");

    if (limit) query = query.limit(limit);

    const news = await query.lean();

    res.json(news);
  } catch (err) {
    console.error("getNews error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   READ — NEW, PAGINATED
========================================================= */

/** GET /api/news/list  -> { success, data, pagination } */
exports.listNews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 12);

    const filter = await buildFilter(req);
    const sort = buildSort(req.query.sort);

    const [items, total] = await Promise.all([
      News.find(filter)
        .populate(PUBLIC_POPULATE)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-contentText -content")
        .lean(),
      News.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    console.error("listNews error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/news/search?q= — lightweight typeahead */
exports.searchNews = async (req, res) => {
  try {
    const q = (req.query.q || req.query.search || "").trim();
    if (!q) return res.json({ success: true, data: [] });

    const limit = Math.min(30, parseInt(req.query.limit, 10) || 10);
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const items = await News.find({
      ...visibilityFilter(req),
      $or: [{ title: rx }, { tagNames: rx }, { destination: rx }, { description: rx }],
    })
      .populate("category")
      .sort({ publishedDate: -1 })
      .limit(limit)
      .select("title slug featuredImage category publishedDate readTime destination")
      .lean();

    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/news/homefeed — every homepage rail in one round trip */
exports.getHomeFeed = async (req, res) => {
  try {
    const base = visibilityFilter(req);
    const lite =
      "title slug subtitle description excerpt featuredImage category tags author publishedDate readTime views destination region breakingNews featured trending editorsPick priority";

    const pick = (extra, limit, sort = { publishedDate: -1 }) =>
      News.find({ ...base, ...extra })
        .populate("category tags")
        .sort(sort)
        .limit(limit)
        .select(lite)
        .lean();

    const [hero, breaking, featured, editorsPick, trending, popular, latest] =
      await Promise.all([
        pick({ isMainTrending: true }, 1, { priority: -1, publishedDate: -1 }),
        pick({ breakingNews: true }, 10),
        pick({ featured: true }, 8, { priority: -1, publishedDate: -1 }),
        pick({ editorsPick: true }, 8),
        pick({ trending: true }, 8, { views: -1, publishedDate: -1 }),
        pick({}, 6, { views: -1 }),
        pick({}, 18),
      ]);

    res.json({
      success: true,
      data: {
        hero: hero[0] || featured[0] || latest[0] || null,
        breaking,
        featured,
        editorsPick,
        trending,
        popular,
        latest,
      },
    });
  } catch (err) {
    console.error("getHomeFeed error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/news/related/:slug */
exports.getRelatedNews = async (req, res) => {
  try {
    const limit = Math.min(12, parseInt(req.query.limit, 10) || 6);

    const current = await News.findOne({ slug: req.params.slug })
      .select("_id category tags")
      .lean();

    if (!current) return res.json({ success: true, data: [] });

    const base = { ...visibilityFilter(req), _id: { $ne: current._id } };

    // same tags first, then same category, de-duplicated
    const byTag = current.tags?.length
      ? await News.find({ ...base, tags: { $in: current.tags } })
          .populate("category")
          .sort({ publishedDate: -1 })
          .limit(limit)
          .select("title slug featuredImage category publishedDate readTime excerpt")
          .lean()
      : [];

    const seen = new Set(byTag.map((n) => String(n._id)));

    const byCategory =
      byTag.length < limit
        ? await News.find({
            ...base,
            category: current.category,
            _id: { $nin: [current._id, ...byTag.map((n) => n._id)] },
          })
            .populate("category")
            .sort({ publishedDate: -1 })
            .limit(limit - byTag.length)
            .select("title slug featuredImage category publishedDate readTime excerpt")
            .lean()
        : [];

    const data = [...byTag, ...byCategory.filter((n) => !seen.has(String(n._id)))];

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/news/id/:id — admin edit-by-id */
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id).populate(
      "category subCategory tags internalLinks.news relatedNews"
    );

    if (!news) return res.status(404).json({ message: "Not found" });

    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/news/:slug
 * Legacy shape preserved: responds with the document itself, not a wrapper.
 */
exports.getNewsBySlug = async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug, deletedAt: null })
      .populate("category subCategory tags internalLinks.news relatedNews")
      .lean();

    if (!news) return res.status(404).json({ message: "Not found" });

    // unpublished content is admin-only
    const isLive =
      news.status === "published" &&
      (!news.publishedDate || new Date(news.publishedDate) <= new Date());

    if (!isLive && !req.admin) {
      return res.status(404).json({ message: "Not found" });
    }

    // atomic counter — no full-document write on every pageview
    News.updateOne({ _id: news._id }, { $inc: { views: 1 } }).catch(() => {});

    res.json({ ...news, views: (news.views || 0) + 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   CREATE
========================================================= */

/** POST /api/news */
exports.createNews = async (req, res) => {
  try {
    const { patch, warnings } = await buildNewsPayload(req.body, { isCreate: true });

    if (!patch.title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!patch.category) {
      return res.status(400).json({ message: "Category is required" });
    }
    if (!patch.description) {
      // schema requires it; derive one rather than rejecting a valid article
      patch.description = (patch.excerpt || patch.title).slice(0, 300);
    }

    patch.slug = await uniqueSlug(News, req.body.slug || patch.title);
    patch.createdBy = req.body.createdBy === "ai" ? "ai" : "admin";

    const news = await News.create(patch);

    if (patch.tags?.length) refreshTagCounts(patch.tags).catch(() => {});

    res.status(201).json(warnings.length ? { ...news.toObject(), warnings } : news);
  } catch (err) {
    console.error("createNews error:", err);
    res.status(400).json({ message: err.message });
  }
};

/** POST /api/news/:id/duplicate */
exports.duplicateNews = async (req, res) => {
  try {
    const source = await News.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ message: "Not found" });

    const {
      _id, createdAt, updatedAt, __v, views, likes, shareCount, bookmarks,
      slug, ...rest
    } = source;

    const title = `${source.title} (Copy)`;

    const copy = await News.create({
      ...rest,
      title,
      slug: await uniqueSlug(News, title),
      status: "draft",
      isMainTrending: false,
      isSubTrending: false,
      publishedDate: new Date(),
    });

    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   UPDATE
========================================================= */

const applyUpdate = async (query, body, res) => {
  const existing = await News.findOne(query);
  if (!existing) return res.status(404).json({ message: "News not found" });

  const previousTags = (existing.tags || []).map(String);

  const { patch, warnings } = await buildNewsPayload(body, { isCreate: false });

  // Slug: only regenerate when the admin explicitly changed it or the title,
  // and never silently collide with another article.
  if (body.slug !== undefined && body.slug !== existing.slug) {
    patch.slug = await uniqueSlug(News, body.slug, existing._id);
  } else if (patch.title && patch.title !== existing.title && body.slug === undefined) {
    patch.slug = await uniqueSlug(News, patch.title, existing._id);
  }

  // Manual edits stop the AI cron from overwriting the article (legacy rule),
  // unless the caller explicitly re-enables it.
  if (body.autoUpdateEnabled === undefined) {
    patch.autoUpdateEnabled = false;
  }

  Object.assign(existing, patch);
  await existing.save();

  const touched = [...new Set([...previousTags, ...(patch.tags || []).map(String)])];
  if (touched.length) refreshTagCounts(touched).catch(() => {});

  const populated = await existing.populate("category subCategory tags");

  return res.json(
    warnings.length ? { ...populated.toObject(), warnings } : populated
  );
};

/** PUT /api/news/:slug — legacy update path, response shape unchanged */
exports.updateNews = (req, res) =>
  applyUpdate({ slug: req.params.slug }, req.body, res).catch((err) => {
    console.error("updateNews error:", err);
    res.status(500).json({ message: err.message });
  });

/** PUT /api/news/id/:id */
exports.updateNewsById = (req, res) =>
  applyUpdate({ _id: req.params.id }, req.body, res).catch((err) => {
    console.error("updateNewsById error:", err);
    res.status(500).json({ message: err.message });
  });

/** PATCH /api/news/:id/status  { status } */
exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["draft", "published", "archived", "scheduled", "trash"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const patch = { status };
    if (status === "published") {
      patch.scheduledAt = null;
      patch.deletedAt = null;
    }

    const news = await News.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!news) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/news/:id/restore — undo archive / soft delete */
exports.restoreNews = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { deletedAt: null, status: req.body.status || "draft" },
      { new: true }
    );

    if (!news) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   ENGAGEMENT
========================================================= */

/** POST /api/news/:slug/like */
exports.likeNews = async (req, res) => {
  try {
    const delta = req.body.unlike ? -1 : 1;
    const news = await News.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { likes: delta } },
      { new: true, projection: "likes" }
    );

    if (!news) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, likes: Math.max(0, news.likes) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/news/:slug/share */
exports.shareNews = async (req, res) => {
  try {
    const news = await News.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { shareCount: 1 } },
      { new: true, projection: "shareCount" }
    );

    if (!news) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, shareCount: news.shareCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   DELETE
========================================================= */

/** DELETE /api/news/:id — hard delete, legacy response preserved */
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);

    if (news?.tags?.length) refreshTagCounts(news.tags).catch(() => {});

    res.json({ message: "News deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/news/:id/trash — reversible delete */
exports.trashNews = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date(), status: "trash" },
      { new: true }
    );

    if (!news) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, message: "Moved to trash" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   BULK OPERATIONS
========================================================= */

const readIds = (req) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  return ids.filter(isObjectId);
};

/** POST /api/news/bulk/status   { ids, status } */
exports.bulkStatus = async (req, res) => {
  try {
    const ids = readIds(req);
    const { status } = req.body;
    const allowed = ["draft", "published", "archived", "scheduled", "trash"];

    if (!ids.length) return res.status(400).json({ success: false, message: "ids required" });
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const patch = { status };
    if (status === "published") patch.deletedAt = null;
    if (status === "trash") patch.deletedAt = new Date();

    const result = await News.updateMany({ _id: { $in: ids } }, patch);

    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/news/bulk/category  { ids, category, subCategory? } */
exports.bulkCategory = async (req, res) => {
  try {
    const ids = readIds(req);
    if (!ids.length) return res.status(400).json({ success: false, message: "ids required" });

    const patch = {};
    if (req.body.category) {
      if (!isObjectId(req.body.category)) {
        return res.status(400).json({ success: false, message: "Invalid category id" });
      }
      patch.category = req.body.category;
    }
    if (req.body.subCategory !== undefined) {
      patch.subCategory = isObjectId(req.body.subCategory) ? req.body.subCategory : null;
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ success: false, message: "Nothing to change" });
    }

    const result = await News.updateMany({ _id: { $in: ids } }, patch);

    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/news/bulk/tags  { ids, tags, mode: "add"|"replace"|"remove" } */
exports.bulkTags = async (req, res) => {
  try {
    const ids = readIds(req);
    if (!ids.length) return res.status(400).json({ success: false, message: "ids required" });

    const { resolveTags } = require("../services/newsPayload.service");
    const { ids: tagIds, names } = await resolveTags(req.body.tags);
    const mode = req.body.mode || "add";

    let update;
    if (mode === "replace") {
      update = { $set: { tags: tagIds, tagNames: names } };
    } else if (mode === "remove") {
      update = { $pull: { tags: { $in: tagIds }, tagNames: { $in: names } } };
    } else {
      update = { $addToSet: { tags: { $each: tagIds }, tagNames: { $each: names } } };
    }

    const result = await News.updateMany({ _id: { $in: ids } }, update);

    refreshTagCounts(tagIds).catch(() => {});

    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/news/bulk/flags  { ids, flags: { featured: true, ... } } */
exports.bulkFlags = async (req, res) => {
  try {
    const ids = readIds(req);
    if (!ids.length) return res.status(400).json({ success: false, message: "ids required" });

    const allowed = [
      "featured", "trending", "popular", "breakingNews", "editorsPick",
      "isMainTrending", "isSubTrending", "isCategoryTrending", "isCategorySubTrending",
    ];

    const patch = {};
    Object.entries(req.body.flags || {}).forEach(([k, v]) => {
      if (allowed.includes(k)) patch[k] = Boolean(v);
    });

    if (!Object.keys(patch).length) {
      return res.status(400).json({ success: false, message: "No valid flags" });
    }

    const result = await News.updateMany({ _id: { $in: ids } }, patch);

    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/news/bulk/delete  { ids, hard? } */
exports.bulkDelete = async (req, res) => {
  try {
    const ids = readIds(req);
    if (!ids.length) return res.status(400).json({ success: false, message: "ids required" });

    if (req.body.hard) {
      const result = await News.deleteMany({ _id: { $in: ids } });
      return res.json({ success: true, deleted: result.deletedCount });
    }

    const result = await News.updateMany(
      { _id: { $in: ids } },
      { deletedAt: new Date(), status: "trash" }
    );

    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   FACETS (admin filters + frontend browse)
========================================================= */

/** GET /api/news/facets — distinct values available for filtering */
exports.getFacets = async (req, res) => {
  try {
    const [regions, countries, languages, authors, destinations] = await Promise.all([
      News.distinct("region", { deletedAt: null, region: { $nin: [null, ""] } }),
      News.distinct("country", { deletedAt: null, country: { $nin: [null, ""] } }),
      News.distinct("language", { deletedAt: null }),
      News.distinct("author.name", { deletedAt: null, "author.name": { $nin: [null, ""] } }),
      News.distinct("destination", { deletedAt: null, destination: { $nin: [null, ""] } }),
    ]);

    res.json({
      success: true,
      data: { regions, countries, languages, authors, destinations },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
