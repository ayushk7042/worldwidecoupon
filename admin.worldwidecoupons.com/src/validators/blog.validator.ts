import { z } from "zod";
import { BLOG_STATUSES } from "../models/Blog.js";
import { bodyBool, objectId, optionalText, optionalUrl, requiredText } from "./common.js";

export const listBlogQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  store: z.string().trim().optional(),
  category: z.string().trim().optional(),
  tag: z.string().trim().optional(),

  status: z.union([z.enum(BLOG_STATUSES), z.literal("all")]).optional(),
  search: optionalText(160),
  featured: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return undefined;
      if (typeof value === "boolean") return value;
      return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    }),
  sort: z.enum(["newest", "oldest", "popular"]).default("newest"),
});
export type ListBlogQuery = z.infer<typeof listBlogQuery>;

const blogCore = {
  title: requiredText("Title", 220),
  slug: optionalText(220),

  excerpt: optionalText(400),
  body: z.string().min(1, "Write something before publishing"),

  image: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
  imageLink: optionalUrl,

  store: objectId.optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  categories: z.array(objectId).default([]),
  tagNames: z.array(z.string().trim().min(1).max(60)).max(20).default([]),

  authorName: optionalText(120),

  status: z.enum(BLOG_STATUSES).default("draft"),
  featured: bodyBool.optional(),

  metaTitle: optionalText(180),
  metaDescription: optionalText(400),
  canonicalUrl: optionalUrl,
};

export const createBlogBody = z.object(blogCore);
export type CreateBlogBody = z.infer<typeof createBlogBody>;

export const updateBlogBody = z.object({ ...blogCore, title: optionalText(220) }).partial();
export type UpdateBlogBody = z.infer<typeof updateBlogBody>;

export const statusBody = z.object({ status: z.enum(BLOG_STATUSES) });

export const bulkStatusBody = z.object({
  ids: z.array(objectId).min(1, "Select at least one post"),
  status: z.enum(BLOG_STATUSES),
});

export const bulkDeleteBody = z.object({
  ids: z.array(objectId).min(1, "Select at least one post"),
});
