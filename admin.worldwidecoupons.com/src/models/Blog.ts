import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import { imageSchema, type ImageRef } from "./shared/image.schema.js";
import { seoSchemaDefinition, type SeoFields } from "./shared/seo.schema.js";

export const BLOG_STATUSES = ["draft", "published", "archived"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/**
 * A blog post. Deliberately its own model rather than a `Coupon` variant —
 * a post outlives any single offer it mentions, and an editor needs to
 * publish, revise and archive it on its own schedule.
 */
export interface Blog extends SeoFields {
  title: string;
  slug: string;
  excerpt?: string;
  /** Sanitised rich HTML — see `sanitizeRich` at the controller boundary. */
  body: string;

  image?: ImageRef | null;
  /**
   * Where the featured image itself leads when clicked — the store's own
   * page by default, but an editor can point it anywhere (an affiliate
   * deep link, a specific coupon), same idea as a `Category.redirectUrl`.
   */
  imageLink?: string;

  store?: Types.ObjectId | null;
  categories: Types.ObjectId[];
  tags: Types.ObjectId[];
  tagNames: string[];

  author?: Types.ObjectId | null;
  authorName?: string;

  status: BlogStatus;
  publishedAt?: Date | null;

  featured: boolean;
  views: number;
  /** Minutes, derived from the body word count — denormalised onto the
   *  document so the listing card can show it without fetching the body
   *  the list query deliberately excludes. */
  readingTime: number;

  createdAt: Date;
  updatedAt: Date;
}

export type BlogDocument = HydratedDocument<Blog>;

const blogSchema = new Schema<Blog>(
  {
    title: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    excerpt: { type: String, trim: true, maxlength: 400 },
    body: { type: String, required: true },

    image: { type: imageSchema, default: null },
    imageLink: { type: String, trim: true },

    store: { type: Schema.Types.ObjectId, ref: "Store", default: null, index: true },
    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    tagNames: [{ type: String, trim: true }],

    author: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    authorName: { type: String, trim: true },

    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },

    featured: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    readingTime: { type: Number, default: 1 },

    ...seoSchemaDefinition,
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ featured: -1, publishedAt: -1 });
blogSchema.index({ title: "text", excerpt: "text", body: "text" });

/** The first time a post goes live, it gets a publish date — later edits to
 *  an already-published post must not quietly bump it back to the top of
 *  the "newest" sort. */
blogSchema.pre("save", function stampPublishDate(next) {
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  if (this.isModified("body")) {
    const words = this.body.trim().split(/\s+/).filter(Boolean).length;
    this.readingTime = Math.max(1, Math.round(words / 200));
  }
  next();
});

export const BlogModel: Model<Blog> =
  (mongoose.models.Blog as Model<Blog>) ?? mongoose.model<Blog>("Blog", blogSchema);
