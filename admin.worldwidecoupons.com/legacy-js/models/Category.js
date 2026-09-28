const mongoose = require("mongoose");
const imageSchema = require("./shared/image.schema");

const categorySchema = new mongoose.Schema(
  {
    /* ================= EXISTING FIELDS (unchanged) ================= */

    name: {
      type: String,
      required: true,
      unique: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    description: String,

    icon: String, // emoji or icon-class; kept as String for old rows

    seoTitle: String,
    seoDescription: String,

    showOnHome: { type: Boolean, default: true },

    maxSubTrending: { type: Number, default: 5 },

    order: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    autoUpdateEnabled: { type: Boolean, default: false },

    dailyAutoUpdateLimit: { type: Number, default: 10 },

    /* ================= NEW: HIERARCHY ================= */

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    /* ================= NEW: PRESENTATION ================= */

    image: imageSchema,
    banner: imageSchema,
    iconImage: imageSchema, // uploaded icon, complements the `icon` string

    color: String, // accent colour used by the frontend theme
    shortLabel: String, // compact label for nav pills

    /* ================= NEW: MERCHANDISING ================= */

    priority: { type: Number, default: 0, index: true },
    featured: { type: Boolean, default: false, index: true },
    hidden: { type: Boolean, default: false, index: true },
    showInMenu: { type: Boolean, default: true },
    showInFooter: { type: Boolean, default: false },

    redirectUrl: String,

    /* ================= NEW: SEO ================= */

    focusKeyword: String,
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    robots: { type: String, default: "index, follow" },
    ogImage: imageSchema,

    /* ================= NEW: COUNTERS ================= */

    articleCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, order: 1 });

/** Convenience virtual so the API can nest children without an extra model. */
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

categorySchema.set("toJSON", { virtuals: true });
categorySchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
