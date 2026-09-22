import { z } from "zod";
import { CATEGORY_STATUSES } from "../models/Category.js";
import {
  bodyBool,
  objectId,
  optionalText,
  optionalUrl,
  queryBool,
  requiredText,
} from "./common.js";

export const listCategoriesQuery = z.object({
  status: z.union([z.enum(CATEGORY_STATUSES), z.literal("all")]).default("active"),
  /** `tree` nests children under parents; otherwise the list is flat. */
  shape: z.enum(["flat", "tree"]).default("flat"),
  parent: z.union([objectId, z.literal("root"), z.literal("all")]).default("all"),
  featured: queryBool,
  showOnHome: queryBool,
  showInMenu: queryBool,
  includeHidden: queryBool,
  search: optionalText(120),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuery>;

const categoryCore = {
  name: requiredText("Category name", 120),
  slug: optionalText(160),
  description: z.string().max(4000).optional(),

  icon: optionalText(80),
  shortLabel: optionalText(60),
  color: optionalText(20),

  image: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
  banner: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
  ogImage: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),

  parent: z.union([objectId, z.null()]).optional(),

  order: z.coerce.number().int().min(-1000).max(1000).optional(),
  priority: z.coerce.number().int().min(-100).max(1000).optional(),

  featured: bodyBool.optional(),
  showOnHome: bodyBool.optional(),
  showInMenu: bodyBool.optional(),
  showInFooter: bodyBool.optional(),
  hidden: bodyBool.optional(),

  status: z.enum(CATEGORY_STATUSES).optional(),
  redirectUrl: optionalUrl,

  metaTitle: optionalText(180),
  metaDescription: optionalText(400),
  focusKeyword: optionalText(120),
  canonicalUrl: optionalUrl,
  robots: optionalText(80),
};

export const createCategoryBody = z.object(categoryCore);
export type CreateCategoryBody = z.infer<typeof createCategoryBody>;

export const updateCategoryBody = z
  .object({ ...categoryCore, name: optionalText(120) })
  .partial();
export type UpdateCategoryBody = z.infer<typeof updateCategoryBody>;

export const reorderCategoriesBody = z.object({
  items: z
    .array(z.object({ id: objectId, order: z.coerce.number().int() }))
    .min(1, "Nothing to reorder"),
});
