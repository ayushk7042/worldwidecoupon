import type { CookieOptions, Response } from "express";
import { isProduction } from "../config/env.js";
import { AdminModel } from "../models/Admin.js";
import { ADMIN_COOKIE } from "../middlewares/auth.middleware.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { sendCreated, sendOk } from "../utils/response.js";
import type {
  changePasswordBody,
  loginBody,
  registerAdminBody,
  updateAdminBody,
} from "../validators/auth.validator.js";
import type { z } from "zod";

/**
 * `sameSite: "none"` is required because the admin panel is served from a
 * different subdomain than the API, and that in turn forces `secure`. In
 * development over plain http, `lax` is the only combination browsers accept.
 */
const cookieOptions = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: maxAgeMs,
  path: "/",
});

const WEEK = 7 * 86_400_000;

function issueSession(res: Response, adminId: string): string {
  const token = signToken({ id: adminId, kind: "admin" });
  res.cookie(ADMIN_COOKIE, token, cookieOptions(WEEK));
  return token;
}

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginBody>;

  const admin = await AdminModel.findOne({ email }).select("+password");

  // One message for both failures: telling an attacker the address exists
  // turns a password guess into a confirmed account.
  const invalid = ApiError.unauthorized("Email or password is incorrect");

  if (!admin) throw invalid;
  if (admin.status !== "active") {
    throw ApiError.forbidden("This account has been suspended");
  }
  if (!(await admin.matchesPassword(password))) throw invalid;

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = issueSession(res, String(admin._id));

  sendOk(res, {
    token,
    admin: {
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    },
  });
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { ...cookieOptions(0), maxAge: undefined });
  sendOk(res, { ok: true }, { message: "Signed out" });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const admin = req.admin;
  if (!admin) throw ApiError.unauthorized();

  sendOk(res, {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions,
    lastLoginAt: admin.lastLoginAt,
  });
});

/** POST /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body as z.infer<
    typeof changePasswordBody
  >;

  const admin = await AdminModel.findById(req.admin?._id).select("+password");
  if (!admin) throw ApiError.unauthorized();

  if (!(await admin.matchesPassword(currentPassword))) {
    throw ApiError.badRequest("Your current password is not correct");
  }

  admin.password = newPassword;
  await admin.save();

  sendOk(res, { ok: true }, { message: "Password changed" });
});

/* =========================================================
   TEAM MANAGEMENT (superadmin)
========================================================= */

export const listAdmins = asyncHandler(async (_req, res) => {
  const admins = await AdminModel.find().sort({ createdAt: -1 }).lean();
  sendOk(res, admins);
});

export const createAdmin = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof registerAdminBody>;

  const exists = await AdminModel.exists({ email: body.email });
  if (exists) throw ApiError.conflict("An account with that email already exists");

  const admin = await AdminModel.create(body);

  sendCreated(
    res,
    { id: String(admin._id), name: admin.name, email: admin.email, role: admin.role },
    "Team member added"
  );
});

export const updateAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const body = req.body as z.infer<typeof updateAdminBody>;

  // Locking yourself out of your own panel is not a recoverable mistake.
  if (String(req.admin?._id) === id && body.status === "suspended") {
    throw ApiError.badRequest("You cannot suspend your own account");
  }

  const admin = await AdminModel.findByIdAndUpdate(
    id,
    { $set: body },
    { new: true, runValidators: true }
  );

  if (!admin) throw ApiError.notFound("Team member not found");

  sendOk(res, admin.toJSON(), { message: "Team member updated" });
});

export const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  if (String(req.admin?._id) === id) {
    throw ApiError.badRequest("You cannot delete your own account");
  }

  const remaining = await AdminModel.countDocuments({ role: "superadmin" });
  const target = await AdminModel.findById(id).select("role").lean();

  if (target?.role === "superadmin" && remaining <= 1) {
    throw ApiError.badRequest("There must be at least one superadmin");
  }

  const admin = await AdminModel.findByIdAndDelete(id);
  if (!admin) throw ApiError.notFound("Team member not found");

  sendOk(res, { id }, { message: "Team member removed" });
});
