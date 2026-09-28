const mongoose = require("mongoose");
const imageSchema = require("./shared/image.schema");

const AD_POSITIONS = [
  "home-hero",
  "home-top",
  "home-infeed",
  "home-mid",
  "home-bottom",
  "sidebar",
  "sidebar-sticky",
  "article-top",
  "article-inline",
  "article-bottom",
  "category-top",
  "category-infeed",
  "footer",
  "mobile-sticky-bottom",
];

const advertisementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    position: {
      type: String,
      enum: AD_POSITIONS,
      required: true,
      index: true,
    },

    // "image" = banner managed here, "script" = adsense/GAM/custom HTML
    type: {
      type: String,
      enum: ["image", "script"],
      default: "image",
    },

    image: imageSchema,
    scriptCode: String,

    targetUrl: String,
    openInNewTab: { type: Boolean, default: true },

    // optional targeting
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    devices: {
      type: [String],
      enum: ["desktop", "tablet", "mobile"],
      default: ["desktop", "tablet", "mobile"],
    },

    priority: { type: Number, default: 0 },

    startsAt: Date,
    endsAt: Date,

    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

const Advertisement =
  mongoose.models.Advertisement ||
  mongoose.model("Advertisement", advertisementSchema);

Advertisement.AD_POSITIONS = AD_POSITIONS;

module.exports = Advertisement;
module.exports.AD_POSITIONS = AD_POSITIONS;
