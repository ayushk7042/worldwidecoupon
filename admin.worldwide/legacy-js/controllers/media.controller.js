const Media = require("../models/Media");
const { cloudinary, cloudinaryThumb } = require("../config/upload");

/* =========================================================
   HELPERS
========================================================= */

const fileToMediaDoc = (file, req) => {
  const url = file.secure_url || file.path || file.url;

  return {
    name: (req.body?.name || file.originalname || "untitled").replace(/\.[^.]+$/, ""),
    originalName: file.originalname,
    folder: (req.body?.folder || req.query?.folder || "uncategorized").trim(),

    public_id: file.filename || file.public_id,
    url,
    secureUrl: file.secure_url || url,
    thumbnailUrl: cloudinaryThumb(url, 400),

    resourceType: file.mimetype?.startsWith("video/") ? "video" : "image",
    format: file.format,
    width: file.width,
    height: file.height,
    bytes: file.bytes || file.size,

    alt: req.body?.alt || "",
    caption: req.body?.caption || "",
    title: req.body?.title || "",
    credit: req.body?.credit || "",
    redirectUrl: req.body?.redirectUrl || "",

    uploadedBy: req.admin?._id,
  };
};

/* =========================================================
   UPLOAD
========================================================= */

/** POST /api/media/upload   — field name: "file" */
exports.uploadSingle = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file received" });
    }

    const media = await Media.create(fileToMediaDoc(req.file, req));

    res.status(201).json({ success: true, data: media });
  } catch (err) {
    console.error("Media upload error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/media/upload-multiple — field name: "files" */
exports.uploadMultiple = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No files received" });
    }

    const docs = await Media.insertMany(files.map((f) => fileToMediaDoc(f, req)));

    res.status(201).json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    console.error("Media bulk upload error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/media/register
 * Adds an external image URL to the library without uploading it, so pasted
 * URLs are reusable too.
 */
exports.registerExternal = async (req, res) => {
  try {
    const { url, name, folder, alt, caption, title, credit, redirectUrl } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: "url is required" });
    }

    const media = await Media.create({
      name: name || url.split("/").pop() || "external",
      url,
      secureUrl: url,
      thumbnailUrl: url,
      folder: folder || "external",
      resourceType: "image",
      alt, caption, title, credit, redirectUrl,
      uploadedBy: req.admin?._id,
    });

    res.status(201).json({ success: true, data: media });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   READ
========================================================= */

/** GET /api/media?page=&limit=&search=&folder=&type=&sort= */
exports.listMedia = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 40);
    const { search, folder, type, sort = "-createdAt" } = req.query;

    const query = {};
    if (folder && folder !== "all") query.folder = folder;
    if (type && type !== "all") query.resourceType = type;

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: rx }, { alt: rx }, { caption: rx }, { originalName: rx }];
    }

    const [items, total] = await Promise.all([
      Media.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Media.countDocuments(query),
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

/** GET /api/media/folders */
exports.listFolders = async (req, res) => {
  try {
    const folders = await Media.aggregate([
      { $group: { _id: "$folder", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: folders.map((f) => ({ name: f._id || "uncategorized", count: f.count })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/media/:id */
exports.getMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: media });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   UPDATE
========================================================= */

/** PUT /api/media/:id — rename / retag / edit metadata / move folder */
exports.updateMedia = async (req, res) => {
  try {
    const allowed = [
      "name", "folder", "alt", "caption", "title", "credit", "redirectUrl", "tags",
    ];

    const patch = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    });

    const media = await Media.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!media) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: media });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/media/:id/replace  — upload a new file over an existing entry.
 * Keeps the same media id so every article referencing it picks up the new art.
 */
exports.replaceMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file received" });
    }

    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Not found" });

    const oldPublicId = media.public_id;
    const url = req.file.secure_url || req.file.path;

    Object.assign(media, {
      public_id: req.file.filename || req.file.public_id,
      url,
      secureUrl: req.file.secure_url || url,
      thumbnailUrl: cloudinaryThumb(url, 400),
      format: req.file.format,
      width: req.file.width,
      height: req.file.height,
      bytes: req.file.bytes || req.file.size,
      originalName: req.file.originalname,
    });

    await media.save();

    if (oldPublicId) {
      cloudinary.uploader
        .destroy(oldPublicId)
        .catch((e) => console.error("Cloudinary destroy failed:", e.message));
    }

    res.json({ success: true, data: media });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   DELETE
========================================================= */

/** DELETE /api/media/:id */
exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Not found" });

    if (media.public_id) {
      await cloudinary.uploader
        .destroy(media.public_id, { resource_type: media.resourceType })
        .catch((e) => console.error("Cloudinary destroy failed:", e.message));
    }

    await media.deleteOne();

    res.json({ success: true, message: "Media deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/media/bulk-delete  { ids: [] } */
exports.bulkDeleteMedia = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "ids array required" });
    }

    const items = await Media.find({ _id: { $in: ids } });

    await Promise.all(
      items
        .filter((m) => m.public_id)
        .map((m) =>
          cloudinary.uploader
            .destroy(m.public_id, { resource_type: m.resourceType })
            .catch((e) => console.error("Cloudinary destroy failed:", e.message))
        )
    );

    const result = await Media.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
