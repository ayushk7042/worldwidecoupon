import { z } from "zod";

export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Not a valid id");

/** Accepts `"a,b"` or `["a","b"]` and always yields a trimmed array. */
export const csvArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return [] as string[];
    const list = Array.isArray(value) ? value : value.split(",");
    return list.map((item) => item.trim()).filter(Boolean);
  });

/** Query-string booleans arrive as `"true"`, never as a real boolean. */
export const queryBool = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") return undefined;
    if (typeof value === "boolean") return value;
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

export const bodyBool = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

export const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

export const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null) return null;
    if (value === undefined || value === "") return undefined;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParam = z.object({ id: objectId });

export const slugParam = z.object({
  idOrSlug: z.string().trim().min(1).max(220),
});

/** Non-empty after trimming, with a helpful message. */
export const requiredText = (label: string, max = 300) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be under ${max} characters`);

export const optionalText = (max = 300) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));
