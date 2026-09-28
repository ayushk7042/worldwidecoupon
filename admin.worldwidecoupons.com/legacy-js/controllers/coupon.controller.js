const Coupon = require("../models/Coupon");
const Store = require("../models/Store");
const { uniqueSlug, normalizeImage, toBool } = require("../utils/newsHelpers");
const { sanitizeInline } = require("../utils/sanitizeContent");
const { refreshCounts } = require("./store.controller");
const { decorateCoupon, decorateCoupons } = require("../utils/couponView");

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

/** Offers that are live right now, whatever their stored status says. */
const liveFilter = () => ({
  status: "active",
  $or: [{ neverExpires: true }, { expiresAt: null }, { expiresAt: { $gte: new Date() } }],
});

/* =========================================================
   PAYLOAD
========================================================= */

const STRING_FIELDS = [
  "title", "code", "discountLabel", "currency", "country",
  "destinationUrl", "metaTitle", "metaDescription",
];

const BOOL_FIELDS = [
  "verified", "exclusive", "featured", "trending", "editorsPick",
  "staffPick", "neverExpires",
];

const NUMBER_FIELDS = ["discountValue", "minimumSpend", "maximumDiscount", "priority"];

const buildCouponPayload = (body = {}) => {
  const patch = {};

  STRING_FIELDS.forEach((key) => {
    if (body[key] !== undefined) patch[key] = String(body[key] ?? "").trim();
  });

  // codes are always shown uppercase, so store them that way
  if (patch.code) patch.code = patch.code.toUpperCase();

  ["description", "terms"].forEach((key) => {
    if (body[key] !== undefined) patch[key] = sanitizeInline(String(body[key] ?? ""));
  });

  BOOL_FIELDS.forEach((key) => {
    if (body[key] !== undefined) patch[key] = toBool(body[key]);
  });

  NUMBER_FIELDS.forEach((key) => {
    if (body[key] !== undefined && body[key] !== "") patch[key] = Number(body[key]) || 0;
  });

  if (body.type !== undefined) patch.type = body.type;
  if (body.discountType !== undefined) patch.discountType = body.discountType;
  if (body.status !== undefined) patch.status = body.status;

  if (body.image !== undefined) patch.image = normalizeImage(body.image);

  if (body.store !== undefined) patch.store = body.store?._id || body.store;

  if (body.categories !== undefined) {
    patch.categories = (Array.isArray(body.categories) ? body.categories : [body.categories])
      .map((c) => c?._id || c)
      .filter(isObjectId);
  }

  if (body.tagNames !== undefined) {
    patch.tagNames = (Array.isArray(body.tagNames) ? body.tagNames : [])
      .map((t) => String(t).trim())
      .filter(Boolean);
  }

  ["startsAt", "expiresAt"].forEach((key) => {
    if (body[key] !== undefined) patch[key] = body[key] ? new Date(body[key]) : null;
  });

  if (patch.verified && !body.verifiedAt) patch.verifiedAt = new Date();

  return patch;
};

/* =========================================================
   READS
========================================================= */

/** GET /api/coupons — the deals feed behind every listing page. */
exports.listCoupons = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      store,
      category,
      type,
      search,
      sort = "best",
      status,
      featured,
      exclusive,
      verified,
      expiringSoon,
    } = req.query;

    const query = status && status !== "all" ? { status } : liveFilter();

    if (store) {
      query.store = isObjectId(store)
        ? store
        : (await Store.findOne({ slug: store }).select("_id").lean())?._id;
    }

    if (category && isObjectId(category)) query.categories = category;
    if (type) query.type = type;
    if (featured === "true") query.featured = true;
    if (exclusive === "true") query.exclusive = true;
    if (verified === "true") query.verified = true;

    if (expiringSoon === "true") {
      const week = new Date(Date.now() + 7 * 86_400_000);
      query.expiresAt = { $gte: new Date(), $lte: week };
      query.neverExpires = { $ne: true };
    }

    if (search) {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { title: { $regex: String(search), $options: "i" } },
            { description: { $regex: String(search), $options: "i" } },
          ],
        },
      ];
    }

    const sorters = {
      best: { priority: -1, verified: -1, discountValue: -1, createdAt: -1 },
      newest: { createdAt: -1 },
      expiring: { expiresAt: 1 },
      popular: { uses: -1, clicks: -1 },
      discount: { discountValue: -1 },
    };

    const perPage = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page), 1) - 1) * perPage;

    const [items, total] = await Promise.all([
      Coupon.find(query)
        .sort(sorters[sort] || sorters.best)
        .skip(skip)
        .limit(perPage)
        .populate("store", "name slug logo brandColor affiliateUrl websiteUrl verified")
        .populate("categories", "name slug")
        .lean(),
      Coupon.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: decorateCoupons(items),
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

/** GET /api/coupons/homefeed — every rail the homepage draws, in one call. */
exports.getHomeFeed = async (_req, res, next) => {
  try {
    const live = liveFilter();
    const storeFields = "name slug logo brandColor affiliateUrl websiteUrl verified";

    const soon = new Date(Date.now() + 5 * 86_400_000);

    const [featured, trending, exclusive, newest, expiring, topStores, popularStores] =
      await Promise.all([
        Coupon.find({ ...live, featured: true })
          .sort({ priority: -1, createdAt: -1 })
          .limit(8)
          .populate("store", storeFields)
          .lean(),

        Coupon.find({ ...live, trending: true })
          .sort({ uses: -1, createdAt: -1 })
          .limit(12)
          .populate("store", storeFields)
          .lean(),

        Coupon.find({ ...live, exclusive: true })
          .sort({ createdAt: -1 })
          .limit(8)
          .populate("store", storeFields)
          .lean(),

        Coupon.find(live)
          .sort({ createdAt: -1 })
          .limit(12)
          .populate("store", storeFields)
          .lean(),

        Coupon.find({
          ...live,
          neverExpires: { $ne: true },
          expiresAt: { $gte: new Date(), $lte: soon },
        })
          .sort({ expiresAt: 1 })
          .limit(8)
          .populate("store", storeFields)
          .lean(),

        Store.find({ status: "active", featured: true })
          .sort({ priority: -1, activeCouponCount: -1 })
          .limit(12)
          .lean(),

        Store.find({ status: "active" })
          .sort({ activeCouponCount: -1, views: -1 })
          .limit(18)
          .lean(),
      ]);

    res.json({
      success: true,
      data: {
        hero: decorateCoupon(featured[0] || trending[0] || newest[0] || null),
        featured: decorateCoupons(featured),
        trending: decorateCoupons(trending),
        exclusive: decorateCoupons(exclusive),
        newest: decorateCoupons(newest),
        expiring: decorateCoupons(expiring),
        topStores,
        popularStores,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/coupons/:idOrSlug */
exports.getCoupon = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const coupon = await Coupon.findOne(
      isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug }
    )
      .populate("store")
      .populate("categories", "name slug")
      .lean();

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, data: decorateCoupon(coupon) });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/coupons/:id/reveal
 * The shopper clicked "Get code". Hand back the code and where to send them,
 * and count the reveal — that number is the "used 2,431 times" line.
 */
exports.revealCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id).populate("store");

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    coupon.uses += 1;
    coupon.clicks += 1;
    await coupon.save();

    const store = coupon.store;
    const base = coupon.destinationUrl || (store ? store.outboundUrl() : "");

    res.json({
      success: true,
      data: {
        code: coupon.type === "code" ? coupon.code : null,
        url: base,
        storeName: store?.name || "",
        uses: coupon.uses,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/coupons/:id/vote — { worked: true|false } */
exports.voteCoupon = async (req, res, next) => {
  try {
    const worked = req.body?.worked !== false;

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $inc: worked ? { successVotes: 1 } : { failVotes: 1 } },
      { new: true }
    ).lean();

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.json({
      success: true,
      data: {
        successVotes: coupon.successVotes,
        failVotes: coupon.failVotes,
        successRate: require("../utils/couponView").successRate(coupon),
      },
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   WRITES
========================================================= */

exports.createCoupon = async (req, res, next) => {
  try {
    const patch = buildCouponPayload(req.body);

    if (!patch.title) {
      return res.status(400).json({ success: false, message: "Coupon title is required" });
    }
    if (!isObjectId(patch.store)) {
      return res.status(400).json({ success: false, message: "Pick a store" });
    }
    if (patch.type === "code" && !patch.code) {
      return res.status(400).json({ success: false, message: "A code offer needs a code" });
    }

    patch.slug = await uniqueSlug(Coupon, req.body.slug || patch.title);

    const coupon = await Coupon.create(patch);
    await refreshCounts(coupon.store);

    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const patch = buildCouponPayload(req.body);

    if (req.body.slug) {
      patch.slug = await uniqueSlug(Coupon, req.body.slug, req.params.id);
    }

    const before = await Coupon.findById(req.params.id).select("store").lean();

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    // a moved offer changes the count at both ends
    await refreshCounts(coupon.store);
    if (before?.store && String(before.store) !== String(coupon.store)) {
      await refreshCounts(before.store);
    }

    res.json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    await refreshCounts(coupon.store);

    res.json({ success: true, message: "Coupon deleted" });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/coupons/:id/status */
exports.changeStatus = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status } },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    await refreshCounts(coupon.store);

    res.json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
};

/** POST /api/coupons/bulk/status — { ids: [], status } */
exports.bulkStatus = async (req, res, next) => {
  try {
    const ids = (req.body.ids || []).filter(isObjectId);

    if (!ids.length) {
      return res.status(400).json({ success: false, message: "No coupons selected" });
    }

    await Coupon.updateMany({ _id: { $in: ids } }, { $set: { status: req.body.status } });

    const stores = await Coupon.distinct("store", { _id: { $in: ids } });
    await Promise.all(stores.map(refreshCounts));

    res.json({ success: true, message: `${ids.length} coupons updated` });
  } catch (err) {
    next(err);
  }
};

/** POST /api/coupons/expire-due — flips anything past its date. */
exports.expireDue = async (_req, res, next) => {
  try {
    const result = await Coupon.updateMany(
      {
        status: "active",
        neverExpires: { $ne: true },
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: "expired" } }
    );

    res.json({ success: true, data: { expired: result.modifiedCount } });
  } catch (err) {
    next(err);
  }
};
