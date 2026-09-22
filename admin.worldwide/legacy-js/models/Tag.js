const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    description: String,

    // SEO
    seoTitle: String,
    seoDescription: String,
    focusKeyword: String,

    // denormalised counter, recomputed by the tag controller
    usageCount: {
      type: Number,
      default: 0,
      index: true,
    },

    featured: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

tagSchema.index({ name: "text" });

module.exports = mongoose.models.Tag || mongoose.model("Tag", tagSchema);
