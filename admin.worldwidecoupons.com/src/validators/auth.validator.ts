import { z } from "zod";
import { ADMIN_PERMISSIONS, ADMIN_ROLES } from "../models/Admin.js";
import { CONTACT_TOPICS } from "../models/Contact.js";
import { objectId, optionalText, requiredText } from "./common.js";

const email = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("That does not look like an email address");

const password = z
  .string({ required_error: "Password is required" })
  .min(8, "Use at least 8 characters");

export const loginBody = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const registerAdminBody = z.object({
  name: requiredText("Name", 120),
  email,
  password,
  role: z.enum(ADMIN_ROLES).default("editor"),
  permissions: z
    .record(z.enum(ADMIN_PERMISSIONS), z.boolean())
    .optional(),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: password,
});

export const updateAdminBody = z.object({
  name: optionalText(120),
  email: email.optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  permissions: z.record(z.enum(ADMIN_PERMISSIONS), z.boolean()).optional(),
});

/* ---------------- shopper accounts ---------------- */

export const shopperRegisterBody = z.object({
  name: requiredText("Name", 120),
  email,
  password,
  newsletter: z.boolean().default(true),
});

export const shopperLoginBody = loginBody;

export const shopperUpdateBody = z.object({
  name: optionalText(120),
  avatar: optionalText(500),
  newsletter: z.boolean().optional(),
});

export const contactBody = z.object({
  name: requiredText("Name", 120),
  email,
  topic: z.enum(CONTACT_TOPICS).default("general"),
  subject: optionalText(200),
  message: requiredText("Message", 5000),
  coupon: objectId.optional(),
  store: objectId.optional(),
  /** Honeypot — a real person never fills this in. */
  website: z.string().max(0, "Rejected").optional(),
});

export const contactReplyBody = z.object({
  message: requiredText("Reply", 5000),
});
