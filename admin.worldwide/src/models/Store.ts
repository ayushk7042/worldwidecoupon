import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import { imageSchema, type ImageRef } from "./shared/image.schema.js";
import { seoSchemaDefinition, type SeoFields } from "./shared/seo.schema.js";
import { withTracking } from "../utils/url.js";

export const STORE_STATUSES = ["active", "inactive"] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

export interface StoreHighlight {
  label: string;
  value: string;
}

export interface StoreFaq {
  question: string;
  answer: string;
}

export interface Store extends SeoFields {
  name: string;
  slug: string;

  tagline?: string;
  description?: string;
  /** Long-form HTML rendered under the coupon list. */
  about?: string;

  /** Plain homepage — the fallback when there is no affiliate deal. */
  websiteUrl?: string;
  /** Monetised link; wins over `websiteUrl` on every button. */
  affiliateUrl?: string;
  /** Appended to the outbound link, e.g. `utm_source=wwc`. */
  trackingParams?: string;
  /** Bare host, kept for logo lookup and duplicate detection. */
  domain?: string;

  logo?: ImageRef | null;
  banner?: ImageRef | null;
  brandColor?: string;

  categories: Types.ObjectId[];
  primaryCategory?: Types.ObjectId | null;

  country: string;
  currency: string;

  featured: boolean;
  popular: boolean;
  trending: boolean;
  verified: boolean;
  exclusive: boolean;

  priority: number;
  status: StoreStatus;

  highlights: StoreHighlight[];
  faqs: StoreFaq[];
  howToRedeem: string[];

  averageDiscount?: string;
  /** Headline offer, refreshed whenever this store's coupons change. */
  bestOffer?: string;

  views: number;
  clicks: number;
  couponCount: number;
  activeCouponCount: number;
  codeCount: number;
  dealCount: number;

  /** Original WordPress term id, so a re-import can match rather than duplicate. */
  legacyTermId?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface StoreMethods {
  /** The URL a shopper should actually be sent to, tracking attached. */
  outboundUrl(): string;
}

export type StoreDocument = HydratedDocument<Store, StoreMethods>;
export type StoreModelType = Model<Store, {}, StoreMethods>;

const highlightSchema = new Schema<StoreHighlight>(
  { label: String, value: String },
  { _id: false }
);

const faqSchema = new Schema<StoreFaq>(
  { question: String, answer: String },
  { _id: false }
);

const storeSchema = new Schema<Store, StoreModelType, StoreMethods>(
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

    tagline: { type: String, trim: true },
    description: { type: String, trim: true },
    about: String,

    websiteUrl: { type: String, trim: true },
    affiliateUrl: { type: String, trim: true },
    trackingParams: { type: String, trim: true },
    domain: { type: String, trim: true, lowercase: true, index: true },

    logo: { type: imageSchema, default: null },
    banner: { type: imageSchema, default: null },
    brandColor: String,

    categories: [{ type: Schema.Types.ObjectId, ref: "Category", index: true }],
    primaryCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    country: { type: String, default: "US", uppercase: true, trim: true },
    currency: { type: String, default: "USD", uppercase: true, trim: true },

    featured: { type: Boolean, default: false, index: true },
    popular: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    verified: { type: Boolean, default: false },
    exclusive: { type: Boolean, default: false },

    priority: { type: Number, default: 0, index: true },

    status: {
      type: String,
      enum: STORE_STATUSES,
      default: "active",
      index: true,
    },

    highlights: { type: [highlightSchema], default: [] },
    faqs: { type: [faqSchema], default: [] },
    howToRedeem: { type: [String], default: [] },

    averageDiscount: String,
    bestOffer: String,

    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    couponCount: { type: Number, default: 0 },
    activeCouponCount: { type: Number, default: 0, index: true },
    codeCount: { type: Number, default: 0 },
    dealCount: { type: Number, default: 0 },

    legacyTermId: { type: Number, index: true, sparse: true },

    ...seoSchemaDefinition,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

storeSchema.index({ name: "text", description: "text", tagline: "text" });
storeSchema.index({ status: 1, priority: -1, name: 1 });
storeSchema.index({ status: 1, activeCouponCount: -1 });
// Powers the A–Z rail without a collection scan per letter.
storeSchema.index({ status: 1, name: 1 });

storeSchema.pre("save", function fillDefaults(next) {
  if (!this.metaTitle && this.name) {
    this.metaTitle = `${this.name} Coupons & Promo Codes`;
  }

  if (!this.metaDescription && this.name) {
    this.metaDescription = `Save with verified ${this.name} coupon codes and deals. Every offer is checked before it goes live.`;
  }

  next();
});

storeSchema.method("outboundUrl", function outboundUrl(this: StoreDocument): string {
  return withTracking(this.affiliateUrl || this.websiteUrl, this.trackingParams);
});

export const StoreModel: StoreModelType =
  (mongoose.models.Store as StoreModelType) ??
  mongoose.model<Store, StoreModelType>("Store", storeSchema);
