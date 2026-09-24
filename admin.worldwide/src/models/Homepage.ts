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

/**
 * One slide in the hero carousel.
 *
 * The artwork is the slide — text is optional and only drawn when a banner is
 * uploaded without it, so a designed image is never covered by a heading.
 */
export interface HomepageBanner {
  image?: ImageRef | null;
  /** Used below 640px when supplied; the desktop image is cropped otherwise. */
  mobileImage?: ImageRef | null;
  title?: string;
  subtitle?: string;
  link?: string;
  ctaLabel?: string;
  /** CSS colour or gradient behind the artwork while it loads. */
  background?: string;
  order: number;
  active: boolean;
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
  heroBanners: HomepageBanner[];

  featuredCoupons: Types.ObjectId[];
  featuredStores: Types.ObjectId[];
  featuredCategories: Types.ObjectId[];

  /** The "Today's best offers" grid: up to 5 hand-picked coupons, one of
   *  them (`bestOffersMain`) shown big with its own image; the rest shown
   *  small, store logo only. Falls back to `featuredCoupons` when empty. */
  bestOffersMain?: Types.ObjectId | null;
  bestOffersCoupons: Types.ObjectId[];

  /** "Trending right now" (up to 6, ranked in this order) and "Fresh promo
   *  codes" (up to 10). Each falls back to its automatic feed when empty. */
  trendingCoupons: Types.ObjectId[];
  promoCoupons: Types.ObjectId[];

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

const bannerSchema = new Schema<HomepageBanner>(
  {
    image: { type: imageSchema, default: null },
    mobileImage: { type: imageSchema, default: null },
    title: String,
    subtitle: String,
    link: String,
    ctaLabel: String,
    background: String,
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
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
    heroBanners: { type: [bannerSchema], default: [] },

    featuredCoupons: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],
    featuredStores: [{ type: Schema.Types.ObjectId, ref: "Store" }],
    featuredCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],

    bestOffersMain: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
    bestOffersCoupons: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],

    trendingCoupons: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],
    promoCoupons: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],

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
