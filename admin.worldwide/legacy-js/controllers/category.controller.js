const Category = require("../models/Category");
const News = require("../models/News");
const { uniqueSlug, makeSlug, normalizeImage, toBool } = require("../utils/newsHelpers");
const { sanitizeInline } = require("../utils/sanitizeContent");

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

/* =========================================================
   PAYLOAD
========================================================= */

const STRING_FIELDS = [
  "name", "description", "icon", "color", "shortLabel", "redirectUrl",
  "seoTitle", "seoDescription", "metaTitle", "metaDescription",
  "focusKeyword", "canonicalUrl", "robots",
];

const BOOL_FIELDS = [
  "showOnHome", "featured", "hidden", "showInMenu", "showInFooter", "autoUpdateEnabled",
];

const NUMBER_FIELDS = ["order", "priority", "maxSubTrending", "dailyAutoUpdateLimit"];

const buildCategoryPayload = (body = {}) => {
  const patch = {};

  STRING_FIELDS.forEach((key) => {
    if (body[key] !== undefined) patch[key] = String(body[key] ?? "").trim();
  });

  if (body.description !== undefined) {
    patch.description = sanitizeInline(String(body.description));
  }

  BOOL_FIELDS.forEach((key) => {
    if (body[key] !== undefined) patch[key] = toBool(body[key]);
  });

  NUMBER_FIELDS.forEach((key) => {
    if (body[key] !== undefined) patch[key] = Number(body[key]) || 0;
  });

  if (body.status !== undefined) {
    patch.status = body.status === "inactive" ? "inactive" : "active";
  }

  if (body.parent !== undefined) {
    patch.parent = isObjectId(body.parent) ? body.parent : null;
  }

  ["image", "banner", "iconImage", "ogImage"].forEach((key) => {
    if (body[key] !== undefined) patch[key] = normalizeImage(body[key]);
  });

  return patch;
};

/* =========================================================
   CREATE
========================================================= */

/** POST /api/categories — response shape unchanged (the document itself) */
exports.createCategory = async (req, res) => {
  try {
    const patch = buildCategoryPayload(req.body);

    if (!patch.name) {
      return res.status(400).json({ message: "Name is required" });
    }

    patch.slug = await uniqueSlug(Category, req.body.slug || patch.name);

    const category = await Category.create(patch);

    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* =========================================================
   READ
========================================================= */

/**
 * GET /api/categories
 * Legacy: bare array of active categories ordered by `order`.
 * Extras (opt-in, so nothing existing changes):
 *   ?status=all     include inactive
 *   ?parent=root    only top-level
 *   ?withCounts=true attach articleCount
 */
exports.getCategories = async (req, res) => {
  try {
    const query = {};

    if (req.query.status === "all" || (req.admin && req.query.status === undefined && req.query.admin === "true")) {
      // no status filter
    } else if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    } else {
      query.status = "active";
    }

    if (req.query.parent === "root") query.parent = null;
    else if (isObjectId(req.query.parent)) query.parent = req.query.parent;

    if (req.query.showInMenu === "true") query.showInMenu = true;
    if (req.query.featured === "true") query.featured = true;
    if (req.query.hidden !== "true" && req.query.status !== "all") query.hidden = { $ne: true };

    let categories = await Category.find(query)
      .sort({ priority: -1, order: 1, name: 1 })
      .lean();

    if (req.query.withCounts === "true") {
      const counts = await News.aggregate([
        { $match: { deletedAt: null, status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]);

      const map = new Map(counts.map((c) => [String(c._id), c.count]));
      categories = categories.map((c) => ({
        ...c,
        articleCount: map.get(String(c._id)) || 0,
      }));
    }

    res.json(categories);
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/categories/tree — parents with nested children */
exports.getCategoryTree = async (req, res) => {
  try {
    const includeInactive = req.query.status === "all";

    const query = includeInactive ? {} : { status: "active", hidden: { $ne: true } };

    const all = await Category.find(query)
      .sort({ priority: -1, order: 1, name: 1 })
      .lean();

    const byParent = new Map();
    all.forEach((c) => {
      const key = c.parent ? String(c.parent) : "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(c);
    });

    const tree = (byParent.get("root") || []).map((parent) => ({
      ...parent,
      children: byParent.get(String(parent._id)) || [],
    }));

    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/categories/:idOrSlug */
exports.getCategory = async (req, res) => {
  try {
    const key = req.params.idOrSlug;

    const category = await Category.findOne(
      isObjectId(key) ? { _id: key } : { slug: makeSlug(key) }
    ).lean();

    if (!category) return res.status(404).json({ message: "Category not found" });

    const children = await Category.find({ parent: category._id, status: "active" })
      .sort({ order: 1 })
      .lean();

    const articleCount = await News.countDocuments({
      category: category._id,
      status: "published",
      deletedAt: null,
    });

    res.json({ success: true, data: { ...category, children, articleCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   UPDATE
========================================================= */

const wantsSlugChange = (body, existing, patch) => {
  if (body.slug !== undefined && body.slug !== existing.slug) return true;
  if (patch.name && patch.name !== existing.name && body.slug === undefined) return true;
  return false;
};

/** PUT /api/categories/:id — response shape unchanged */
exports.updateCategory = async (req, res) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Category not found" });

    const patch = buildCategoryPayload(req.body);

    if (wantsSlugChange(req.body, existing, patch)) {
      patch.slug = await uniqueSlug(
        Category,
        req.body.slug || patch.name || existing.name,
        existing._id
      );
    }

    // a category must never become its own ancestor
    if (patch.parent && String(patch.parent) === String(existing._id)) {
      patch.parent = null;
    }

    Object.assign(existing, patch);
    await existing.save();

    res.json(existing);
  } catch (err) {
    console.error("updateCategory error:", err);
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/categories/reorder  { order: [{ id, order }] } */
exports.reorderCategories = async (req, res) => {
  try {
    const items = Array.isArray(req.body.order) ? req.body.order : [];
    if (!items.length) {
      return res.status(400).json({ success: false, message: "order array required" });
    }

    await Promise.all(
      items
        .filter((i) => isObjectId(i.id))
        .map((i) => Category.findByIdAndUpdate(i.id, { order: Number(i.order) || 0 }))
    );

    res.json({ success: true, message: "Order updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/categories/:id/visibility  { hidden?, status?, showOnHome? } */
exports.toggleVisibility = async (req, res) => {
  try {
    const patch = {};
    if (req.body.hidden !== undefined) patch.hidden = toBool(req.body.hidden);
    if (req.body.showOnHome !== undefined) patch.showOnHome = toBool(req.body.showOnHome);
    if (req.body.showInMenu !== undefined) patch.showInMenu = toBool(req.body.showInMenu);
    if (req.body.status !== undefined) {
      patch.status = req.body.status === "inactive" ? "inactive" : "active";
    }

    const category = await Category.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!category) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   DELETE
========================================================= */

/**
 * DELETE /api/categories/:id — legacy response preserved.
 * Refuses to orphan articles unless ?force=true, in which case children are
 * promoted to root and articles are moved to ?moveTo=<categoryId>.
 */
exports.deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const articleCount = await News.countDocuments({ category: id, deletedAt: null });
    const childCount = await Category.countDocuments({ parent: id });

    if ((articleCount || childCount) && req.query.force !== "true") {
      return res.status(409).json({
        message: `Category is in use: ${articleCount} article(s), ${childCount} sub-category(ies). Re-send with ?force=true&moveTo=<categoryId> to proceed.`,
        articleCount,
        childCount,
      });
    }

    if (articleCount && isObjectId(req.query.moveTo)) {
      await News.updateMany({ category: id }, { category: req.query.moveTo });
    }

    if (childCount) {
      await Category.updateMany({ parent: id }, { parent: null });
    }

    await Category.findByIdAndDelete(id);

    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
