import mongoose from "mongoose";
import { imageSchema, type ImageRef } from "./image.schema.js";

const { Schema } = mongoose;

/** The SEO block every public-facing document carries. */
export interface SeoFields {
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  robots?: string;
  ogImage?: ImageRef | null;
  schemaMarkup?: unknown;
}

export const seoSchemaDefinition = {
  metaTitle: { type: String, trim: true, maxlength: 180 },
  metaDescription: { type: String, trim: true, maxlength: 400 },
  focusKeyword: { type: String, trim: true },
  canonicalUrl: { type: String, trim: true },
  robots: { type: String, default: "index, follow" },
  ogImage: { type: imageSchema, default: null },
  schemaMarkup: { type: Schema.Types.Mixed, default: null },
} as const;
