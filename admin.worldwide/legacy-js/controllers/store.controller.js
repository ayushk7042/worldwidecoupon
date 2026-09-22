const Store = require("../models/Store");
const Coupon = require("../models/Coupon");
const { uniqueSlug, normalizeImage, toBool } = require("../utils/newsHelpers");
const { sanitizeInline, sanitizeContent } = require("../utils/sanitizeContent");
const { decorateCoupons } = require("../utils/couponView");

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

/* =========================================================
   PAYLOAD
========================================================= */

const STRING_FIELDS = [
  "name", "tagline", "websiteUrl", "affiliateUrl", "trackingParams",
  "brandColor", "country", "currency", "averageDiscount", "bestOffer",
  "metaTitle", "metaDescription", "focusKeyword", "canonicalUrl", "robots",
];

const BOOL_FIELDS = ["featured", "popular", "trending", "verified", "exclusive"];

const IMAGE_FIELDS = ["logo", "banner", "ogImage"];

const idsOf = (value) =>
  (Array.isArray(value) ? value : [value])
    .map((item) => item?._id || item)
    .filter((id) => isObjectId(id));

const buildStorePayload = (body = {}) => {
  const patch = {};

  STRING_FIELDS.forEach((key) => {
    if (body[key] !== undefined) patch[key] = String(body[key] ?? "").trim();
  });

  if (body.description !== undefined) {
    patch.description = sanitizeInline(String(body.description));
  }

  // the long "about this store" block keeps its formatting
  if (body.about !== undefined) patch.about = sanitizeContent(String(body.about));

  BOOL_FIELDS.forEach((key) => {
    if (body[key] !== undefined) patch[key] = toBool(body[key]);
  });

  if (body.priority !== undefined) patch.priority = Number(body.priority) || 0;

  if (body.status !== undefined) {
    patch.status = body.status === "inactive" ? "inactive" : "active";
  }

  IMAGE_FIELDS.forEach((key) => {
    if (body[key] !== undefined) patch[key] = normalizeImage(body[key]);
  });

  if (body.categories !== undefined) patch.categories = idsOf(body.categories);

  if (body.primaryCategory !== undefined) {
    patch.primaryCategory = isObjectId(body.primaryCategory?._id || body.primaryCategory)
      ? body.primaryCategory?._id || body.primaryCategory
      : null;
  }

  if (Array.isArray(body.highlights)) {
    patch.highlights = body.highlights
      .filter((row) => row?.label)
      .map((row) => ({
        label: sanitizeInline(String(row.label)),
        value: sanitizeInline(String(row.value || "")),
      }));
  }

  if (Array.isArray(body.faqs)) {
    patch.faqs = body.faqs
      .filter((row) => row?.question)
      .map((row) => ({
        question: sanitizeInline(String(row.question)),
        answer: sanitizeContent(String(row.answer || "")),
      }));
  }

  if (Array.isArray(body.howToRedeem)) {
    patch.howToRedeem = body.howToRedeem
      .map((step) => sanitizeInline(String(step || "")))
      .filter(Boolean);
  }

  if (body.schemaMarkup !== undefined) {
    try {
      patch.schemaMarkup =
        typeof body.schemaMarkup === "string"
          ? JSON.parse(body.schemaMarkup)
          : body.schemaMarkup;
    } catch {
      patch.schemaMarkup = null;
    }
  }

  return patch;
};

/**
 * Keeps `couponCount` / `activeCouponCount` / `bestOffer` honest.
 * Called after any write that could change a store's offers.
 */
const refreshCounts = async (storeId) => {
  if (!isObjectId(storeId)) return;

  const [total, active, best] = await Promise.all([
    Coupon.countDocuments({ store: storeId, status: { $ne: "archived" } }),
    Coupon.countDocuments({ store: storeId, status: "active" }),
    Coupon.findOne({ store: storeId, status: "active" })
      .sort({ priority: -1, discountValue: -1, createdAt: -1 })
      .select("title discountType discountValue discountLabel")
      .lean(),
  ]);

  const bestOffer = best
    ? best.discountLabel ||
      (best.discountType === "percent" && best.discountValue
        ? `${best.discountValue}% off`
        : best.title)
    : "";

  await Store.updateOne(
    { _id: storeId },
    { $set: { couponCount: total, activeCouponCount: active, bestOffer } }
  );
};

/* =========================================================
   READS
========================================================= */

/** GET /api/stores — filter, sort, paginate. */
exports.listStores = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 24,
      search,
      category,
      letter,
      status = "active",
      sort = "popular",
      featured,
      country,
    } = req.query;

    const query = {};

    if (status !== "all") query.status = status;
    if (country) query.country = country;
    if (featured === "true") query.featured = true;

    if (category && isObjectId(category)) query.categories = category;

    // the A–Z rail: "#" collects everything that does not start with a letter
    if (letter) {
      query.name = letter === "#" ? { $regex: "^[^a-zA-Z]" } : { $regex: `^${letter}`, $options: "i" };
    }

    if (search) {
      query.name = { $regex: String(search).trim(), $options: "i" };
    }

    const sorters = {
      popular: { activeCouponCount: -1, views: -1 },
      name: { name: 1 },
      newest: { createdAt: -1 },
      priority: { priority: -1, name: 1 },
      offers: { activeCouponCount: -1 },
    };

    const perPage = Math.min(Number(limit) || 24, 200);
    const skip = (Math.max(Number(page), 1) - 1) * perPage;

    const [items, total] = await Promise.all([
      Store.find(query)
        .sort(sorters[sort] || sorters.popular)
        .skip(skip)
        .limit(perPage)
        .populate("primaryCategory", "name slug")
        .lean(),
      Store.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: Number(page),
        limit: perPage,
        total,
        pages: Math.ceil(total / perPage) || 1,
        hasMore: skip + items.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/stores/letters — how many stores sit under each initial. */
exports.getLetterCounts = async (_req, res, next) => {
  try {
    const rows = await Store.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: { $toUpper: { $substrCP: ["$name", 0, 1] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {};
    rows.forEach((row) => {
      const key = /^[A-Z]$/.test(row._id) ? row._id : "#";
      counts[key] = (counts[key] || 0) + row.count;
    });

    res.json({ success: true, data: counts });
  } catch (err) {
    next(err);
  }
};

/** GET /api/stores/:idOrSlug — the store plus its live offers. */
exports.getStore = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const store = await Store.findOne(
      isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug }
    )
      .populate("categories", "name slug icon")
      .populate("primaryCategory", "name slug icon")
      .lean();

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const now = new Date();

    const [active, expired] = await Promise.all([
      Coupon.find({
        store: store._id,
        status: "active",
        $or: [{ neverExpires: true }, { expiresAt: null }, { expiresAt: { $gte: now } }],
      })
        .sort({ priority: -1, verified: -1, discountValue: -1, createdAt: -1 })
        .lean(),

      Coupon.find({ store: store._id, status: "expired" })
        .sort({ expiresAt: -1 })
        .limit(10)
        .lean(),
    ]);

    Store.updateOne({ _id: store._id }, { $inc: { views: 1 } }).catch(() => {});

    res.json({
      success: true,
      data: {
        ...store,
        coupons: decorateCoupons(active),
        expiredCoupons: decorateCoupons(expired),
      },
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/stores/:id/click — records an outbound click, returns the link. */
exports.trackClick = async (req, res, next) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    store.clicks += 1;
    await store.save();

    res.json({ success: true, data: { url: store.outboundUrl() } });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   WRITES
========================================================= */

exports.createStore = async (req, res, next) => {
  try {
    const patch = buildStorePayload(req.body);

    if (!patch.name) {
      return res.status(400).json({ success: false, message: "Store name is required" });
    }

    patch.slug = await uniqueSlug(Store, req.body.slug || patch.name);

    const store = await Store.create(patch);

    res.status(201).json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
};

exports.updateStore = async (req, res, next) => {
  try {
    const patch = buildStorePayload(req.body);

    if (req.body.slug) {
      patch.slug = await uniqueSlug(Store, req.body.slug, req.params.id);
    }

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    res.json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
};

exports.deleteStore = async (req, res, next) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // an offer without a store is unreachable, so it goes too
    await Coupon.deleteMany({ store: store._id });

    res.json({ success: true, message: "Store and its offers deleted" });
  } catch (err) {
    next(err);
  }
};

exports.refreshCounts = refreshCounts;
