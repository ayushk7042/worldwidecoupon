import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Universal image sub-document — logos, banners, OG images, coupon artwork.
 *
 * `public_id` is empty when an editor pasted a plain URL instead of uploading,
 * which is the normal case for imported data.
 */
export interface ImageRef {
  public_id?: string;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  alt?: string;
  caption?: string;
  title?: string;
  credit?: string;
  lazyLoad?: boolean;
  priority?: boolean;
}

export const imageSchema = new Schema<ImageRef>(
  {
    public_id: String,
    url: String,
    thumbnailUrl: String,
    width: Number,
    height: Number,
    format: String,
    bytes: Number,

    alt: String,
    caption: String,
    title: String,
    credit: String,

    lazyLoad: { type: Boolean, default: true },
    priority: { type: Boolean, default: false },
  },
  { _id: false }
);

/** Normalises whatever the admin form sent — a URL string or a full object. */
export function normalizeImage(input: unknown): ImageRef | null {
  if (!input) return null;

  if (typeof input === "string") {
    const url = input.trim();
    return url ? { url } : null;
  }

  if (typeof input !== "object") return null;

  const source = input as Record<string, unknown>;
  const url = String(source.url ?? source.secure_url ?? "").trim();
  if (!url) return null;

  const image: ImageRef = { url };

  if (source.public_id) image.public_id = String(source.public_id);
  if (source.thumbnailUrl) image.thumbnailUrl = String(source.thumbnailUrl);
  if (source.alt) image.alt = String(source.alt);
  if (source.caption) image.caption = String(source.caption);
  if (source.title) image.title = String(source.title);
  if (source.credit) image.credit = String(source.credit);
  if (source.format) image.format = String(source.format);

  const width = Number(source.width);
  const height = Number(source.height);
  const bytes = Number(source.bytes);

  if (Number.isFinite(width)) image.width = width;
  if (Number.isFinite(height)) image.height = height;
  if (Number.isFinite(bytes)) image.bytes = bytes;

  return image;
}
