import type { RequestHandler } from "express";
import { AdminModel, type AdminPermission } from "../models/Admin.js";
import { SiteUserModel } from "../models/SiteUser.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { readToken, verifyToken } from "../utils/jwt.js";

export const ADMIN_COOKIE = "token";
export const SHOPPER_COOKIE = "siteToken";

/* =========================================================
   ADMIN
========================================================= */

export const requireAdmin: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = readToken(req.headers as Record<string, unknown>, req.cookies, ADMIN_COOKIE);
  if (!token) throw ApiError.unauthorized();

  const { id } = verifyToken(token, "admin");

  const admin = await AdminModel.findById(id);
  if (!admin || admin.status !== "active") {
    throw ApiError.unauthorized("This account is no longer active");
  }

  req.admin = admin;
  next();
});

/**
 * Decodes a token when one is present but never rejects.
 *
 * Lets a public endpoint quietly return drafts to a signed-in editor without
 * maintaining a parallel set of admin-only routes.
 */
export const optionalAdmin: RequestHandler = asyncHandler(async (req, _res, next) => {
  req.admin = null;

  const token = readToken(req.headers as Record<string, unknown>, req.cookies, ADMIN_COOKIE);
  if (!token) return next();

  try {
    const { id } = verifyToken(token, "admin");
    const admin = await AdminModel.findById(id);
    if (admin && admin.status === "active") req.admin = admin;
  } catch {
    // An invalid token on a public route simply means "not signed in".
  }

  next();
});

/** Must run after `requireAdmin`. */
export const requirePermission =
  (permission: AdminPermission): RequestHandler =>
  (req, _res, next) => {
    const admin = req.admin;
    if (!admin) return next(ApiError.unauthorized());
    if (!admin.can(permission)) {
      return next(ApiError.forbidden("Your role does not allow this action"));
    }
    next();
  };

export const requireSuperadmin: RequestHandler = (req, _res, next) => {
  if (req.admin?.role !== "superadmin") {
    return next(ApiError.forbidden("Superadmin only"));
  }
  next();
};

/** Convenience bundles used by the route files. */
export const canPublish = [requireAdmin, requirePermission("canPublish")];
export const canDelete = [requireAdmin, requirePermission("canDelete")];
export const canManageStores = [requireAdmin, requirePermission("canManageStores")];
export const canImport = [requireAdmin, requirePermission("canImport")];
export const canManageUsers = [requireAdmin, requirePermission("canManageUsers")];

/* =========================================================
   SHOPPER
========================================================= */

export const requireShopper: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = readToken(req.headers as Record<string, unknown>, req.cookies, SHOPPER_COOKIE);
  if (!token) throw ApiError.unauthorized();

  const { id } = verifyToken(token, "site");

  const user = await SiteUserModel.findById(id).select("_id status").lean();
  if (!user || user.status !== "active") {
    throw ApiError.unauthorized("This account is no longer active");
  }

  req.shopper = { id: String(user._id) };
  next();
});

/** Renders either way, but knows the shopper when there is one. */
export const optionalShopper: RequestHandler = asyncHandler(async (req, _res, next) => {
  req.shopper = null;

  const token = readToken(req.headers as Record<string, unknown>, req.cookies, SHOPPER_COOKIE);
  if (!token) return next();

  try {
    const { id } = verifyToken(token, "site");
    const user = await SiteUserModel.findById(id).select("_id status").lean();
    if (user && user.status === "active") req.shopper = { id: String(user._id) };
  } catch {
    req.shopper = null;
  }

  next();
});
