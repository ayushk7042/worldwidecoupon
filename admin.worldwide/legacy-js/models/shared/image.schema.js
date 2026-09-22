const mongoose = require("mongoose");

/**
 * Universal image sub-schema.
 *
 * Used for featuredImage, ogImage, twitterImage, gallery items, author image,
 * category image/icon/banner and every inline image reference.
 *
 * Backward compatibility: the legacy News.featuredImage only had
 * { public_id, url }. Those two fields keep the same names and meaning, so old
 * documents load unchanged and old clients that read `featuredImage.url`
 * keep working.
 */
const imageSchema = new mongoose.Schema(
  {
    // --- source ---
    public_id: String, // cloudinary id (empty when the admin pasted a plain URL)
    url: String,
    thumbnailUrl: String,
    width: Number,
    height: Number,
    format: String,
    bytes: Number,

    // --- presentation ---
    alt: String,
    caption: String,
    title: String,
    credit: String,

    // --- behaviour ---
    redirectUrl: String,
    openInNewTab: { type: Boolean, default: true },
    nofollow: { type: Boolean, default: true },
    lazyLoad: { type: Boolean, default: true },
    priority: { type: Boolean, default: false }, // eager-load / fetchpriority=high
    responsive: { type: Boolean, default: true },
  },
  { _id: false }
);

module.exports = imageSchema;
