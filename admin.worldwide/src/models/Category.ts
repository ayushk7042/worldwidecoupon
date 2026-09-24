import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import { imageSchema, type ImageRef } from "./shared/image.schema.js";
import { seoSchemaDefinition, type SeoFields } from "./shared/seo.schema.js";

export const CATEGORY_STATUSES = ["active", "inactive"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export interface Category extends SeoFields {
  name: string;
  slug: string;
  description?: string;

  /** Emoji or icon-class for compact nav pills. */
  icon?: string;
  shortLabel?: string;
  color?: string;

  image?: ImageRef | null;
  banner?: ImageRef | null;
  /** Artwork for the category page header; falls back to the banner's right side. */
  headerImage?: ImageRef | null;

  parent?: Types.ObjectId | null;

  order: number;
  priority: number;

  featured: boolean;
  showOnHome: boolean;
  showInMenu: boolean;
  showInFooter: boolean;
  hidden: boolean;

  status: CategoryStatus;

  redirectUrl?: string;

  /** Denormalised counters, refreshed by `category.service`. */
  storeCount: number;
  couponCount: number;
  activeCouponCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<Category>;

const categorySchema = new Schema<Category>(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: { type: String, trim: true },

    icon: String,
    shortLabel: { type: String, trim: true },
    color: String,

    image: { type: imageSchema, default: null },
    banner: { type: imageSchema, default: null },
    headerImage: { type: imageSchema, default: null },

    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    order: { type: Number, default: 0 },
    priority: { type: Number, default: 0, index: true },

    featured: { type: Boolean, default: false, index: true },
    showOnHome: { type: Boolean, default: true },
    showInMenu: { type: Boolean, default: true },
    showInFooter: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false, index: true },

    status: {
      type: String,
      enum: CATEGORY_STATUSES,
      default: "active",
      index: true,
    },

    redirectUrl: String,

    storeCount: { type: Number, default: 0 },
    couponCount: { type: Number, default: 0 },
    activeCouponCount: { type: Number, default: 0 },

    ...seoSchemaDefinition,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

categorySchema.index({ parent: 1, order: 1 });
categorySchema.index({ status: 1, hidden: 1, priority: -1, name: 1 });
categorySchema.index({ name: "text", description: "text" });

/** Lets the API nest a tree without a second model or a recursive query. */
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

categorySchema.pre("save", function fillDefaults(next) {
  if (!this.metaTitle && this.name) {
    this.metaTitle = `${this.name} Coupons & Promo Codes`;
  }
  if (!this.shortLabel && this.name) {
    this.shortLabel = this.name;
  }
  next();
});

export const CategoryModel: Model<Category> =
  (mongoose.models.Category as Model<Category>) ?? mongoose.model<Category>("Category", categorySchema);
