import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface Tag {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  featured: boolean;
  couponCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TagDocument = HydratedDocument<Tag>;

const tagSchema = new Schema<Tag>(
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
    description: String,
    color: String,
    featured: { type: Boolean, default: false, index: true },
    couponCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

tagSchema.index({ name: "text" });

export const TagModel: Model<Tag> =
  (mongoose.models.Tag as Model<Tag>) ?? mongoose.model<Tag>("Tag", tagSchema);
