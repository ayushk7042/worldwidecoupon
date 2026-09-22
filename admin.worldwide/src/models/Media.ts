import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

/**
 * One document per uploaded asset, so the admin can search, rename, replace
 * and reuse images instead of uploading the same logo five times.
 */
export interface Media {
  name: string;
  originalName?: string;
  folder: string;

  public_id?: string;
  url: string;
  secureUrl?: string;
  thumbnailUrl?: string;

  resourceType: "image" | "video" | "raw";
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;

  alt?: string;
  caption?: string;
  title?: string;
  credit?: string;

  tags: string[];
  usageCount: number;

  uploadedBy?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export type MediaDocument = HydratedDocument<Media>;

const mediaSchema = new Schema<Media>(
  {
    name: { type: String, required: true, trim: true },
    originalName: String,
    folder: { type: String, default: "uncategorized", index: true },

    public_id: { type: String, index: true },
    url: { type: String, required: true },
    secureUrl: String,
    thumbnailUrl: String,

    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      default: "image",
      index: true,
    },

    format: String,
    width: Number,
    height: Number,
    bytes: Number,

    alt: String,
    caption: String,
    title: String,
    credit: String,

    tags: { type: [String], default: [] },
    usageCount: { type: Number, default: 0 },

    uploadedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true }
);

mediaSchema.index({ name: "text", alt: "text", caption: "text" });
mediaSchema.index({ createdAt: -1 });

export const MediaModel: Model<Media> =
  (mongoose.models.Media as Model<Media>) ?? mongoose.model<Media>("Media", mediaSchema);
