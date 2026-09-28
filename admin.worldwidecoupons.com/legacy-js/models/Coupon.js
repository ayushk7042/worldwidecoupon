const mongoose = require("mongoose");
const imageSchema = require("./shared/image.schema");
const view = require("../utils/couponView");

/**
 * One offer at one store.
 *
 * Two kinds exist. A `code` offer has something to copy — the shopper reveals
 * it, we copy it, and the store opens in a new tab. A `deal` offer has no code:
 * the discount is already live behind the link. Everything else is the same,
 * so both live here and `type` decides how the card behaves.
 */
const couponSchema = new mongoose.Schema(
  {
    /* ---------------- what it is ---------------- */

    title: { type: String, required: true, trim: true },

    slug: { type: String, unique: true, index: true, lowercase: true, trim: true },

    description: String,
    terms: String, // the small print, shown behind a "Terms" toggle

    type: {
      type: String,
      enum: ["code", "deal", "freeshipping", "bogo", "cashback", "printable"],
      default: "code",
      index: true,
    },

    /** Only meaningful when type is "code". Revealed on click, never before. */
    code: { type: String, trim: true },

    /* ---------------- the saving ---------------- */

    discountType: {
      type: String,
      enum: ["percent", "fixed", "shipping", "gift", "other"],
      default: "percent",
    },

    discountValue: Number, // 40 for "40% off", 15 for "$15 off"
    discountLabel: String, // overrides the generated badge text
    currency: { type: String, default: "USD" },

    minimumSpend: Number,
    maximumDiscount: Number,

    /* ---------------- where it applies ---------------- */

    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true }],

    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
    tagNames: [String],

    country: { type: String, default: "US" },

    /* ---------------- the link ---------------- */

    /** Overrides the store's affiliate link when this offer has its own. */
    destinationUrl: String,

    /* ---------------- timing ---------------- */

    startsAt: Date,
    expiresAt: { type: Date, index: true },
    neverExpires: { type: Boolean, default: false },

    /* ---------------- trust ---------------- */

    verified: { type: Boolean, default: false, index: true },
    verifiedAt: Date,

    exclusive: { type: Boolean, default: false, index: true },

    /** Shoppers vote after using it; drives the "92% success rate" line. */
    successVotes: { type: Number, default: 0 },
    failVotes: { type: Number, default: 0 },

    /* ---------------- placement ---------------- */

    featured: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    editorsPick: { type: Boolean, default: false, index: true },
    staffPick: { type: Boolean, default: false },

    priority: { type: Number, default: 0, index: true },

    status: {
      type: String,
      enum: ["active", "expired", "draft", "archived"],
      default: "active",
      index: true,
    },

    image: imageSchema,

    /* ---------------- SEO ---------------- */

    metaTitle: String,
    metaDescription: String,

    /* ---------------- counters ---------------- */

    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    uses: { type: Number, default: 0 }, // reveals — the "used 2,431 times" line
    saves: { type: Number, default: 0 },
  },
  { timestamps: true }
);

couponSchema.index({ store: 1, status: 1, priority: -1 });
couponSchema.index({ status: 1, expiresAt: 1 });
couponSchema.index({ title: "text", description: "text", code: "text" });

const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

couponSchema.pre("save", async function preSave() {
  if (!this.slug && this.title) {
    this.slug = `${slugify(this.title)}-${Date.now().toString(36)}`;
  }

  // an offer past its date is expired no matter what the form said
  if (this.expiresAt && !this.neverExpires && this.expiresAt < new Date()) {
    if (this.status === "active") this.status = "expired";
  }
});

/* ---------------- read-only helpers the API sends to the client ----------------
   The same functions run for lean reads — see utils/couponView.js. */

couponSchema.virtual("isExpired").get(function isExpired() {
  return view.isExpired(this);
});

couponSchema.virtual("successRate").get(function successRate() {
  return view.successRate(this);
});

couponSchema.virtual("badge").get(function badge() {
  return view.badge(this);
});

couponSchema.set("toJSON", { virtuals: true });
couponSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Coupon", couponSchema);
