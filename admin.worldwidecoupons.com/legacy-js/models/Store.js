const mongoose = require("mongoose");
const imageSchema = require("./shared/image.schema");

/**
 * A retailer whose offers we list — Nike, Amazon, Booking.com and so on.
 *
 * `affiliateUrl` is where a shopper actually lands when they take an offer;
 * `websiteUrl` is the plain homepage, shown when there is no affiliate deal.
 * Coupons point at a store, and the store page lists them.
 */
const storeSchema = new mongoose.Schema(
  {
    /* ---------------- identity ---------------- */

    name: { type: String, required: true, trim: true },

    slug: { type: String, unique: true, index: true, lowercase: true, trim: true },

    tagline: String, // "Just Do It" — one line under the logo
    description: String, // short intro on the store page
    about: String, // long-form HTML, rendered under the coupon list

    /* ---------------- links ---------------- */

    websiteUrl: String,
    affiliateUrl: String, // takes priority over websiteUrl on every button
    trackingParams: String, // appended to the outbound link, e.g. "utm_source=tsd"

    /* ---------------- artwork ---------------- */

    logo: imageSchema,
    banner: imageSchema,
    brandColor: String, // used behind the logo tile on cards

    /* ---------------- placement ---------------- */

    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true }],

    primaryCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },

    country: { type: String, default: "US" },
    currency: { type: String, default: "USD" },

    /* ---------------- flags ---------------- */

    featured: { type: Boolean, default: false, index: true },
    popular: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    verified: { type: Boolean, default: false },
    exclusive: { type: Boolean, default: false }, // we have codes nobody else has

    priority: { type: Number, default: 0, index: true },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    /* ---------------- shopper-facing detail ---------------- */

    /** Free-form rows shown as a table: "Free shipping over", "$50". */
    highlights: [
      {
        label: String,
        value: String,
        _id: false,
      },
    ],

    /** Answered on the store page and emitted as FAQ schema. */
    faqs: [
      {
        question: String,
        answer: String,
        _id: false,
      },
    ],

    /** "How to use a Nike coupon" — numbered steps. */
    howToRedeem: [String],

    averageDiscount: String, // "25% off" — shown on the store card
    bestOffer: String, // headline offer, refreshed by the coupon hooks

    /* ---------------- SEO ---------------- */

    metaTitle: String,
    metaDescription: String,
    focusKeyword: String,
    canonicalUrl: String,
    robots: { type: String, default: "index, follow" },
    ogImage: imageSchema,
    schemaMarkup: mongoose.Schema.Types.Mixed,

    /* ---------------- counters ---------------- */

    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    couponCount: { type: Number, default: 0 },
    activeCouponCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

storeSchema.index({ name: "text", description: "text", tagline: "text" });
storeSchema.index({ status: 1, priority: -1, name: 1 });

const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

storeSchema.pre("save", async function preSave() {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  if (!this.metaTitle && this.name) {
    this.metaTitle = `${this.name} Coupons & Promo Codes`;
  }
});

/** The outbound link a shopper should follow, with tracking attached. */
storeSchema.methods.outboundUrl = function outboundUrl() {
  const base = this.affiliateUrl || this.websiteUrl || "";
  if (!base || !this.trackingParams) return base;
  return base + (base.includes("?") ? "&" : "?") + this.trackingParams;
};

module.exports = mongoose.model("Store", storeSchema);
