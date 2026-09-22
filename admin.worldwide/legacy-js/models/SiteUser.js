const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * A shopper with an account — separate from `Admin`, which runs the panel.
 * Keeping them apart means a leaked shopper password can never reach the CMS.
 */
const siteUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: { type: String, required: true, select: false },

    avatar: String,

    /* ---------------- what they follow ---------------- */

    favouriteStores: [{ type: mongoose.Schema.Types.ObjectId, ref: "Store" }],
    savedCoupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],

    /** Stores they want an email about when a new code lands. */
    alerts: [
      {
        store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
        createdAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],

    newsletter: { type: Boolean, default: true },

    /* ---------------- account state ---------------- */

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },

    lastLoginAt: Date,

    resetToken: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

siteUserSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

siteUserSchema.methods.matchesPassword = function matchesPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("SiteUser", siteUserSchema);
