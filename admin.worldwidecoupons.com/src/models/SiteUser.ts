import bcrypt from "bcryptjs";
import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

/**
 * A shopper with an account — deliberately a different collection from
 * `Admin`, so a leaked shopper password can never reach the CMS.
 */
export interface SiteUser {
  name: string;
  email: string;
  password: string;
  avatar?: string;

  favouriteStores: Types.ObjectId[];
  savedCoupons: Types.ObjectId[];

  /** Stores they want an email about when a new code lands. */
  alerts: { store: Types.ObjectId; createdAt: Date }[];

  newsletter: boolean;
  status: "active" | "suspended";

  lastLoginAt?: Date | null;
  resetToken?: string | null;
  resetTokenExpires?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface SiteUserMethods {
  matchesPassword(plain: string): Promise<boolean>;
}

export type SiteUserDocument = HydratedDocument<SiteUser, SiteUserMethods>;
export type SiteUserModelType = Model<SiteUser, {}, SiteUserMethods>;

const alertSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const siteUserSchema = new Schema<SiteUser, SiteUserModelType, SiteUserMethods>(
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

    favouriteStores: [{ type: Schema.Types.ObjectId, ref: "Store" }],
    savedCoupons: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],

    alerts: { type: [alertSchema], default: [] },

    newsletter: { type: Boolean, default: true },

    status: { type: String, enum: ["active", "suspended"], default: "active", index: true },

    lastLoginAt: { type: Date, default: null },

    resetToken: { type: String, select: false, default: null },
    resetTokenExpires: { type: Date, select: false, default: null },
  },
  { timestamps: true }
);

siteUserSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

siteUserSchema.method("matchesPassword", function matchesPassword(
  this: SiteUserDocument,
  plain: string
) {
  return bcrypt.compare(plain, this.password);
});

export const SiteUserModel: SiteUserModelType =
  (mongoose.models.SiteUser as SiteUserModelType) ??
  mongoose.model<SiteUser, SiteUserModelType>("SiteUser", siteUserSchema);
