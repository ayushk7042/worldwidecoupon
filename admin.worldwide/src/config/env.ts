import "dotenv/config";
import { z } from "zod";

/**
 * Every environment variable the app reads, declared once and validated at
 * boot. A typo in `.env` fails the process immediately with a readable list
 * instead of surfacing as `undefined` three layers deep at request time.
 */
const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return fallback;
      return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    });

const csv = (fallback: string[] = []) =>
  z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .concat(value ? [] : fallback)
    );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  /** Public origin of the storefront — used to build canonical + redirect URLs. */
  SITE_URL: z.string().url().default("https://worldwidecoupons.com"),
  SITE_NAME: z.string().default("WorldwideCoupons"),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRE: z.string().default("7d"),
  SITE_JWT_EXPIRE: z.string().default("30d"),

  CORS_ORIGINS: csv([
    "https://worldwidecoupons.com",
    "https://www.worldwidecoupons.com",
    "https://admin.worldwidecoupons.com",
  ]),

  CLOUDINARY_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("worldwidecoupons"),

  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),

  /** Appended to every outbound store link when the store has no override. */
  DEFAULT_TRACKING_PARAMS: z.string().default(""),

  /** Service used to guess a store logo from its domain. */
  LOGO_SERVICE: z.string().default("https://logo.clearbit.com"),

  ENABLE_CRON: bool(true),
  ENABLE_REQUEST_LOG: bool(true),
  TRUST_PROXY: bool(false),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

/** Cloudinary is optional — media upload endpoints disable themselves without it. */
export const hasCloudinary = Boolean(
  env.CLOUDINARY_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

export const hasMailer = Boolean(env.MAIL_HOST && env.MAIL_USER && env.MAIL_PASS);

export type Env = typeof env;
