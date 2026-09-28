const mongoose = require("mongoose");

/**
 * Media library entry. One document per uploaded (or registered) asset so the
 * admin can search, filter, rename, replace and reuse images instead of
 * re-uploading them.
 */
const mediaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    originalName: String,

    folder: {
      type: String,
      default: "uncategorized",
      index: true,
    },

    // cloudinary
    public_id: { type: String, index: true },
    url: { type: String, required: true },
    secureUrl: String,
    thumbnailUrl: String,

    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      default: "image",
    },

    format: String,
    width: Number,
    height: Number,
    bytes: Number,

    // reusable defaults copied into an article when the asset is picked
    alt: String,
    caption: String,
    title: String,
    credit: String,
    redirectUrl: String,

    tags: [String],

    usageCount: { type: Number, default: 0 },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

mediaSchema.index({ name: "text", alt: "text", caption: "text" });
mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Media || mongoose.model("Media", mediaSchema);
