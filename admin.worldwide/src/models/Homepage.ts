import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import { imageSchema, type ImageRef } from "./shared/image.schema.js";

/**
 * Editorial control over the homepage.
 *
 * A single document (`singleton: "homepage"`). When a rail is left empty the
 * homepage controller falls back to an automatic query, so the site still
 * looks complete before anyone has curated anything.
 */
export interface HomepageBlock {
  title: string;
  subtitle?: string;
  link?: string;
  image?: ImageRef | null;
  order: number;
}

export interface HomepageCategorySection {
  category: Types.ObjectId;
  heading?: string;
  coupons: Types.ObjectId[];
  stores: Types.ObjectId[];
  order: number;
}

export interface Homepage {
  singleton: "homepage";

  heroCoupon?: Types.ObjectId | null;
  heroHeading?: string;
  heroSubheading?: string;
  heroImage?: ImageRef | null;

  featuredCoupons: Types.ObjectId[];
  featuredStores: Types.ObjectId[];
  featuredCategories: Types.ObjectId[];

  categorySections: HomepageCategorySection[];
  customBlocks: HomepageBlock[];

  announcement?: { text?: string; link?: string; active?: boolean };

  updatedAt: Date;
  createdAt: Date;
}

export type HomepageDocument = HydratedDocument<Homepage>;

const blockSchema = new Schema<HomepageBlock>(
  {
    title: { type: String, required: true },
    subtitle: String,
    link: String,
    image: { type: imageSchema, default: null },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const categorySectionSchema = new Schema<HomepageCategorySection>(
  {
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    heading: String,
    coupons: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],
    stores: [{ type: Schema.Types.ObjectId, ref: "Store" }],
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const homepageSchema = new Schema<Homepage>(
  {
    singleton: {
      type: String,
      default: "homepage",
      enum: ["homepage"],
      unique: true,
      index: true,
    },

    heroCoupon: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
    heroHeading: String,
    heroSubheading: String,
    heroImage: { type: imageSchema, default: null },

    featuredCoupons: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],
    featuredStores: [{ type: Schema.Types.ObjectId, ref: "Store" }],
    featuredCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],

    categorySections: { type: [categorySectionSchema], default: [] },
    customBlocks: { type: [blockSchema], default: [] },

    announcement: {
      text: String,
      link: String,
      active: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const HomepageModel: Model<Homepage> =
  (mongoose.models.Homepage as Model<Homepage>) ?? mongoose.model<Homepage>("Homepage", homepageSchema);
