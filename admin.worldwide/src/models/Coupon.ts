import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import { imageSchema, type ImageRef } from "./shared/image.schema.js";
import { seoSchemaDefinition, type SeoFields } from "./shared/seo.schema.js";

/**
 * One offer at one store.
 *
 * Two shapes exist and the whole UI hinges on which one it is:
 *
 *  - a **code** offer has something to copy. The shopper reveals it, we copy
 *    it to their clipboard and open the store in a new tab.
 *  - a **deal** offer has no code. The discount is already live behind the
 *    link, so the button is a straight redirect.
 *
 * Everything else — the badge, the store, the dates, the counters — is shared,
 * so both live in this one collection and `type` decides the behaviour.
 */
export const COUPON_TYPES = [
  "code",
  "deal",
  "freeshipping",
  "bogo",
  "cashback",
  "giftcard",
  "printable",
] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const DISCOUNT_TYPES = [
  "percent",
  "fixed",
  "shipping",
  "gift",
  "bogo",
  "other",
] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const COUPON_STATUSES = ["active", "expired", "draft", "archived"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

/** Types that carry a code the shopper must copy. */
export const CODE_BEARING_TYPES: readonly CouponType[] = ["code", "printable"];

export interface Coupon extends SeoFields {
  title: string;
  slug: string;

  description?: string;
  /** The small print, shown behind a "Terms" toggle. */
  terms?: string;

  type: CouponType;

  /** Only meaningful for a code-bearing type. Never sent in list responses. */
  code?: string;

  discountType: DiscountType;
  /** 40 for "40% off", 15 for "$15 off". */
  discountValue?: number;
  /** Overrides the generated badge text. */
  discountLabel?: string;
  currency: string;

  minimumSpend?: number;
  maximumDiscount?: number;

  store: Types.ObjectId;
  categories: Types.ObjectId[];
  tags: Types.ObjectId[];
  tagNames: string[];

  country: string;

  /** The deal link. Overrides the store's affiliate URL when present. */
  destinationUrl?: string;
  /** Deep link to the exact product or landing page, when the feed gave one. */
  landingUrl?: string;

  startsAt?: Date | null;
  expiresAt?: Date | null;
  neverExpires: boolean;
  lastCheckedAt?: Date | null;

  verified: boolean;
  verifiedAt?: Date | null;

  exclusive: boolean;

  /** Shoppers vote after using it; drives the "92% worked" line. */
  successVotes: number;
  failVotes: number;

  featured: boolean;
  trending: boolean;
  editorsPick: boolean;
  staffPick: boolean;

  priority: number;
  status: CouponStatus;

  image?: ImageRef | null;

  views: number;
  clicks: number;
  /** Reveals — the "used 2,431 times" line. */
  uses: number;
  saves: number;

  /** Original WordPress post id, so a re-import updates instead of duplicating. */
  legacyId?: number;
  source?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type CouponDocument = HydratedDocument<Coupon>;

const couponSchema = new Schema<Coupon>(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: String,
    terms: String,

    type: {
      type: String,
      enum: COUPON_TYPES,
      default: "deal",
      index: true,
    },

    code: { type: String, trim: true, uppercase: true },

    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      default: "other",
    },

    discountValue: Number,
    discountLabel: { type: String, trim: true },
    currency: { type: String, default: "USD", uppercase: true },

    minimumSpend: Number,
    maximumDiscount: Number,

    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    categories: [{ type: Schema.Types.ObjectId, ref: "Category", index: true }],
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    tagNames: { type: [String], default: [] },

    country: { type: String, default: "US", uppercase: true },

    destinationUrl: { type: String, trim: true },
    landingUrl: { type: String, trim: true },

    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    neverExpires: { type: Boolean, default: false },
    lastCheckedAt: { type: Date, default: null },

    verified: { type: Boolean, default: false, index: true },
    verifiedAt: { type: Date, default: null },

    exclusive: { type: Boolean, default: false, index: true },

    successVotes: { type: Number, default: 0 },
    failVotes: { type: Number, default: 0 },

    featured: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    editorsPick: { type: Boolean, default: false, index: true },
    staffPick: { type: Boolean, default: false },

    priority: { type: Number, default: 0, index: true },

    status: {
      type: String,
      enum: COUPON_STATUSES,
      default: "active",
      index: true,
    },

    image: { type: imageSchema, default: null },

    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    uses: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },

    legacyId: { type: Number, index: true, sparse: true },
    source: { type: String, default: "manual" },

    ...seoSchemaDefinition,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* The three shapes every listing query takes. */
couponSchema.index({ store: 1, status: 1, priority: -1, createdAt: -1 });
couponSchema.index({ status: 1, neverExpires: 1, expiresAt: 1 });
couponSchema.index({ status: 1, featured: -1, priority: -1, createdAt: -1 });
couponSchema.index({ categories: 1, status: 1, priority: -1 });
couponSchema.index({ title: "text", description: "text", code: "text" });

couponSchema.pre("save", function enforceExpiry(next) {
  // A code-bearing type without a code is really just a deal.
  if (!this.code && CODE_BEARING_TYPES.includes(this.type)) {
    this.type = "deal";
  }

  // An offer past its date is expired no matter what the form said.
  if (
    this.status === "active" &&
    !this.neverExpires &&
    this.expiresAt &&
    this.expiresAt.getTime() < Date.now()
  ) {
    this.status = "expired";
  }

  if (this.verified && !this.verifiedAt) this.verifiedAt = new Date();

  next();
});

export const CouponModel: Model<Coupon> =
  (mongoose.models.Coupon as Model<Coupon>) ?? mongoose.model<Coupon>("Coupon", couponSchema);
