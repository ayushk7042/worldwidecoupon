const Tag = require("../models/Tag");
const News = require("../models/News");
const { uniqueSlug, makeSlug, toBool } = require("../utils/newsHelpers");
const { sanitizeInline } = require("../utils/sanitizeContent");

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

/* =========================================================
   READ
========================================================= */

/** GET /api/tags?search=&page=&limit=&sort=&featured= */
exports.listTags = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);

    const query = {};
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    else if (!req.admin) query.status = "active";

    if (req.query.featured === "true") query.featured = true;

    if (req.query.search) {
      query.name = new RegExp(
        String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
    }

    const sortMap = {
      popular: { usageCount: -1 },
      name: { name: 1 },
      latest: { createdAt: -1 },
    };
    const sort = sortMap[req.query.sort] || { usageCount: -1, name: 1 };

    const [items, total] = await Promise.all([
      Tag.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Tag.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/tags/:idOrSlug */
exports.getTag = async (req, res) => {
  try {
    const key = req.params.idOrSlug;

    const tag = await Tag.findOne(
      isObjectId(key) ? { _id: key } : { slug: makeSlug(key) }
    ).lean();

    if (!tag) return res.status(404).json({ success: false, message: "Tag not found" });

    res.json({ success: true, data: tag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   WRITE
========================================================= */

const buildTagPayload = (body = {}) => {
  const patch = {};

  ["name", "seoTitle", "seoDescription", "focusKeyword"].forEach((k) => {
    if (body[k] !== undefined) patch[k] = String(body[k] ?? "").trim();
  });

  if (body.description !== undefined) {
    patch.description = sanitizeInline(String(body.description));
  }
  if (body.featured !== undefined) patch.featured = toBool(body.featured);
  if (body.status !== undefined) {
    patch.status = body.status === "inactive" ? "inactive" : "active";
  }

  return patch;
};

/** POST /api/tags */
exports.createTag = async (req, res) => {
  try {
    const patch = buildTagPayload(req.body);
    if (!patch.name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const slug = makeSlug(req.body.slug || patch.name);
    const existing = await Tag.findOne({ slug });
    if (existing) {
      return res.status(409).json({ success: false, message: "Tag already exists", data: existing });
    }

    patch.slug = slug;
    const tag = await Tag.create(patch);

    res.status(201).json({ success: true, data: tag });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/** PUT /api/tags/:id */
exports.updateTag = async (req, res) => {
  try {
    const existing = await Tag.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Not found" });

    const patch = buildTagPayload(req.body);

    if (
      (req.body.slug !== undefined && req.body.slug !== existing.slug) ||
      (patch.name && patch.name !== existing.name && req.body.slug === undefined)
    ) {
      patch.slug = await uniqueSlug(Tag, req.body.slug || patch.name, existing._id);
    }

    Object.assign(existing, patch);
    await existing.save();

    // keep the denormalised names on articles in sync after a rename
    if (patch.name) {
      await refreshNamesForTag(existing._id);
    }

    res.json({ success: true, data: existing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Rebuild tagNames for every article carrying a given tag. */
const refreshNamesForTag = async (tagId) => {
  const affected = await News.find({ tags: tagId }).select("tags").lean();

  await Promise.all(
    affected.map(async (article) => {
      const tags = await Tag.find({ _id: { $in: article.tags } }).select("name").lean();
      await News.updateOne(
        { _id: article._id },
        { tagNames: tags.map((t) => t.name) }
      );
    })
  );
};

/**
 * POST /api/tags/merge  { sourceIds: [], targetId }
 * Moves every article from the source tags onto the target, then deletes the
 * sources. Article tag lists are de-duplicated.
 */
exports.mergeTags = async (req, res) => {
  try {
    const sourceIds = (req.body.sourceIds || []).filter(isObjectId);
    const targetId = req.body.targetId;

    if (!sourceIds.length || !isObjectId(targetId)) {
      return res
        .status(400)
        .json({ success: false, message: "sourceIds[] and targetId are required" });
    }

    if (sourceIds.includes(String(targetId))) {
      return res
        .status(400)
        .json({ success: false, message: "Target cannot be one of the sources" });
    }

    const target = await Tag.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: "Target tag not found" });

    await News.updateMany(
      { tags: { $in: sourceIds } },
      { $addToSet: { tags: target._id, tagNames: target.name } }
    );

    await News.updateMany(
      { tags: { $in: sourceIds } },
      { $pull: { tags: { $in: sourceIds } } }
    );

    const sources = await Tag.find({ _id: { $in: sourceIds } }).select("name").lean();
    await News.updateMany(
      { tagNames: { $in: sources.map((s) => s.name) } },
      { $pull: { tagNames: { $in: sources.map((s) => s.name) } } }
    );

    await Tag.deleteMany({ _id: { $in: sourceIds } });

    target.usageCount = await News.countDocuments({ tags: target._id, deletedAt: null });
    await target.save();

    res.json({ success: true, message: `Merged ${sourceIds.length} tag(s)`, data: target });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/tags/recount — rebuild every usageCount */
exports.recountTags = async (req, res) => {
  try {
    const counts = await News.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
    ]);

    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    const tags = await Tag.find().select("_id").lean();

    await Promise.all(
      tags.map((t) =>
        Tag.updateOne({ _id: t._id }, { usageCount: map.get(String(t._id)) || 0 })
      )
    );

    res.json({ success: true, message: `Recounted ${tags.length} tags` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** DELETE /api/tags/:id */
exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) return res.status(404).json({ success: false, message: "Not found" });

    await News.updateMany(
      { tags: tag._id },
      { $pull: { tags: tag._id, tagNames: tag.name } }
    );

    await tag.deleteOne();

    res.json({ success: true, message: "Tag deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/tags/bulk-delete  { ids: [] } */
exports.bulkDeleteTags = async (req, res) => {
  try {
    const ids = (req.body.ids || []).filter(isObjectId);
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "ids required" });
    }

    const tags = await Tag.find({ _id: { $in: ids } }).select("name").lean();

    await News.updateMany(
      { tags: { $in: ids } },
      { $pull: { tags: { $in: ids }, tagNames: { $in: tags.map((t) => t.name) } } }
    );

    const result = await Tag.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
