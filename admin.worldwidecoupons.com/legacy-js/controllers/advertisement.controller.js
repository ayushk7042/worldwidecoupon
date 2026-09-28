const Advertisement = require("../models/Advertisement");
const { AD_POSITIONS } = require("../models/Advertisement");
const { normalizeImage, toBool, parseDate } = require("../utils/newsHelpers");

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

/* =========================================================
   PUBLIC
========================================================= */

/**
 * GET /api/ads/serve?position=&device=&category=
 * Returns the ads a page should render right now, cheapest possible query.
 */
exports.serveAds = async (req, res) => {
  try {
    const now = new Date();
    const { position, device, category } = req.query;

    const query = {
      status: "active",
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    };

    if (position) query.position = position;
    if (device) query.devices = device;
    if (isObjectId(category)) {
      query.$and.push({ $or: [{ categories: { $size: 0 } }, { categories: category }] });
    }

    const ads = await Advertisement.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(20)
      .select("name position type image scriptCode targetUrl openInNewTab devices")
      .lean();

    res.json({ success: true, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/ads/:id/impression — fire-and-forget counter */
exports.trackImpression = async (req, res) => {
  Advertisement.updateOne({ _id: req.params.id }, { $inc: { impressions: 1 } }).catch(() => {});
  res.json({ success: true });
};

/** POST /api/ads/:id/click */
exports.trackClick = async (req, res) => {
  Advertisement.updateOne({ _id: req.params.id }, { $inc: { clicks: 1 } }).catch(() => {});
  res.json({ success: true });
};

/* =========================================================
   ADMIN
========================================================= */

const buildAdPayload = (body = {}) => {
  const patch = {};

  ["name", "scriptCode", "targetUrl"].forEach((k) => {
    if (body[k] !== undefined) patch[k] = String(body[k] ?? "").trim();
  });

  if (body.position !== undefined) patch.position = body.position;
  if (body.type !== undefined) patch.type = body.type === "script" ? "script" : "image";
  if (body.image !== undefined) patch.image = normalizeImage(body.image);
  if (body.openInNewTab !== undefined) patch.openInNewTab = toBool(body.openInNewTab, true);
  if (body.priority !== undefined) patch.priority = Number(body.priority) || 0;
  if (body.status !== undefined) patch.status = body.status === "paused" ? "paused" : "active";

  if (body.devices !== undefined) {
    const valid = ["desktop", "tablet", "mobile"];
    const list = Array.isArray(body.devices) ? body.devices : String(body.devices).split(",");
    patch.devices = list.map((d) => String(d).trim()).filter((d) => valid.includes(d));
    if (!patch.devices.length) patch.devices = valid;
  }

  if (body.categories !== undefined) {
    const list = Array.isArray(body.categories) ? body.categories : [body.categories];
    patch.categories = list.filter(isObjectId);
  }

  if (body.startsAt !== undefined) patch.startsAt = parseDate(body.startsAt);
  if (body.endsAt !== undefined) patch.endsAt = parseDate(body.endsAt);

  return patch;
};

/** GET /api/ads — admin listing with stats */
exports.listAds = async (req, res) => {
  try {
    const query = {};
    if (req.query.position && req.query.position !== "all") query.position = req.query.position;
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;

    const ads = await Advertisement.find(query)
      .populate("categories", "name slug")
      .sort({ position: 1, priority: -1 })
      .lean();

    res.json({ success: true, data: ads, positions: AD_POSITIONS });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/ads */
exports.createAd = async (req, res) => {
  try {
    const patch = buildAdPayload(req.body);

    if (!patch.name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!AD_POSITIONS.includes(patch.position)) {
      return res.status(400).json({
        success: false,
        message: `Invalid position. Allowed: ${AD_POSITIONS.join(", ")}`,
      });
    }

    const ad = await Advertisement.create(patch);

    res.status(201).json({ success: true, data: ad });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/** PUT /api/ads/:id */
exports.updateAd = async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndUpdate(
      req.params.id,
      buildAdPayload(req.body),
      { new: true }
    );

    if (!ad) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** DELETE /api/ads/:id */
exports.deleteAd = async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, message: "Advertisement deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
