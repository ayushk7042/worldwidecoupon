import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import { imageSchema, type ImageRef } from "./shared/image.schema.js";

export const AD_POSITIONS = [
  "home-hero",
  "home-top",
  "home-infeed",
  "home-mid",
  "home-bottom",
  "sidebar",
  "sidebar-sticky",
  "store-top",
  "store-inline",
  "store-bottom",
  "coupon-top",
  "coupon-inline",
  "category-top",
  "category-infeed",
  "footer",
  "mobile-sticky-bottom",
] as const;
export type AdPosition = (typeof AD_POSITIONS)[number];

export const AD_DEVICES = ["desktop", "tablet", "mobile"] as const;
export type AdDevice = (typeof AD_DEVICES)[number];

export interface Advertisement {
  name: string;
  position: AdPosition;
  /** `image` = banner managed here, `script` = AdSense/GAM/custom HTML. */
  type: "image" | "script";

  image?: ImageRef | null;
  scriptCode?: string;

  targetUrl?: string;
  openInNewTab: boolean;

  categories: Types.ObjectId[];
  stores: Types.ObjectId[];
  devices: AdDevice[];

  priority: number;
  startsAt?: Date | null;
  endsAt?: Date | null;

  impressions: number;
  clicks: number;

  status: "active" | "paused";

  createdAt: Date;
  updatedAt: Date;
}

export type AdvertisementDocument = HydratedDocument<Advertisement>;

const advertisementSchema = new Schema<Advertisement>(
  {
    name: { type: String, required: true, trim: true },

    position: { type: String, enum: AD_POSITIONS, required: true, index: true },
    type: { type: String, enum: ["image", "script"], default: "image" },

    image: { type: imageSchema, default: null },
    scriptCode: String,

    targetUrl: String,
    openInNewTab: { type: Boolean, default: true },

    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    stores: [{ type: Schema.Types.ObjectId, ref: "Store" }],

    devices: {
      type: [String],
      enum: AD_DEVICES,
      default: [...AD_DEVICES],
    },

    priority: { type: Number, default: 0 },

    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },

    status: { type: String, enum: ["active", "paused"], default: "active", index: true },
  },
  { timestamps: true }
);

advertisementSchema.index({ position: 1, status: 1, priority: -1 });

export const AdvertisementModel: Model<Advertisement> =
  (mongoose.models.Advertisement as Model<Advertisement>) ??
  mongoose.model<Advertisement>("Advertisement", advertisementSchema);
