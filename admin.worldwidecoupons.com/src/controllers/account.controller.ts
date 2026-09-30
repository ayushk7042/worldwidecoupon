import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { CookieOptions, Response } from "express";
import type { z } from "zod";
import { env, isProduction } from "../config/env.js";
import { SHOPPER_COOKIE } from "../middlewares/auth.middleware.js";
import { CouponModel } from "../models/Coupon.js";
import { SiteUserModel } from "../models/SiteUser.js";
import { StoreModel } from "../models/Store.js";
import { sendMail } from "../services/mail.service.js";
import { STORE_CARD_FIELDS } from "../services/coupon.service.js";
import { liveCouponFilter } from "../services/counters.service.js";
import { decorateCoupons } from "../services/couponView.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { sendCreated, sendOk } from "../utils/response.js";
import type {
  shopperForgotBody,
  shopperLoginBody,
  shopperRegisterBody,
  shopperResetBody,
  shopperUpdateBody,
} from "../validators/auth.validator.js";

const MONTH = 30 * 86_400_000;

const cookieOptions = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: maxAgeMs,
  path: "/",
});

function issueSession(res: Response, userId: string): string {
  const token = signToken({ id: userId, kind: "site" });
  res.cookie(SHOPPER_COOKIE, token, cookieOptions(MONTH));
  return token;
}

const publicUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  avatar?: string;
  newsletter: boolean;
}) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  avatar: user.avatar ?? null,
  newsletter: user.newsletter,
});

/* =========================================================
   SESSION
========================================================= */

/** POST /api/account/register */
export const register = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof shopperRegisterBody>;

  const exists = await SiteUserModel.exists({ email: body.email });
  if (exists) throw ApiError.conflict("An account with that email already exists");

  const user = await SiteUserModel.create(body);
  const token = issueSession(res, String(user._id));

  sendCreated(res, { token, user: publicUser(user) }, "Welcome aboard");
});

/** POST /api/account/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as z.infer<typeof shopperLoginBody>;

  const user = await SiteUserModel.findOne({ email }).select("+password");
  const invalid = ApiError.unauthorized("Email or password is incorrect");

  if (!user) throw invalid;
  if (user.status !== "active") throw ApiError.forbidden("This account is suspended");
  if (!(await user.matchesPassword(password))) throw invalid;

  user.lastLoginAt = new Date();
  await user.save();

  const token = issueSession(res, String(user._id));

  sendOk(res, { token, user: publicUser(user) });
});

/** POST /api/account/logout */
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(SHOPPER_COOKIE, { ...cookieOptions(0), maxAge: undefined });
  sendOk(res, { ok: true }, { message: "Signed out" });
});

/* =========================================================
   FORGOT / RESET PASSWORD

   The OTP itself is never stored in the clear — only its bcrypt hash, in the
   same `resetToken` field a reset-link design would have used — so a
   database read alone can never hand out a working code.
========================================================= */

const OTP_TTL_MS = 10 * 60_000;

function generateOtp(): string {
  // crypto.randomInt, not Math.random: this is a credential, not a UI id.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** POST /api/account/forgot-password */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body as z.infer<typeof shopperForgotBody>;

  // Same response whether or not the account exists — confirming an address
  // by reply turns "forgot password" into an account-enumeration tool.
  const genericMessage = "If that email has an account, we've sent a 6-digit code to it";

  const user = await SiteUserModel.findOne({ email });
  if (!user) {
    sendOk(res, { ok: true }, { message: genericMessage });
    return;
  }

  const otp = generateOtp();
  user.resetToken = await bcrypt.hash(otp, 10);
  user.resetTokenExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  const result = await sendMail({
    to: user.email,
    subject: `Your ${env.SITE_NAME} password reset code`,
    html: `
      <p>Hi ${user.name},</p>
      <p>Use this code to reset your ${env.SITE_NAME} password. It expires in 10 minutes.</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:0.3em;margin:24px 0;">${otp}</p>
      <p>If you did not ask for this, you can ignore this email — your password will not change.</p>
      <p>— ${env.SITE_NAME}</p>
    `,
    text: `Your ${env.SITE_NAME} password reset code is ${otp}. It expires in 10 minutes.`,
  });

  if (!result.sent) {
    // The code is already saved — better to tell the shopper it did not
    // arrive than to have them wait on an email that is never coming.
    throw ApiError.internal("Could not send the reset email. Try again shortly.");
  }

  sendOk(res, { ok: true }, { message: genericMessage });
});

/** POST /api/account/reset-password */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body as z.infer<typeof shopperResetBody>;

  const user = await SiteUserModel.findOne({ email }).select(
    "+password +resetToken +resetTokenExpires"
  );

  const invalid = ApiError.badRequest("That code is incorrect or has expired");

  if (!user?.resetToken || !user.resetTokenExpires) throw invalid;
  if (user.resetTokenExpires.getTime() < Date.now()) throw invalid;
  if (!(await bcrypt.compare(otp, user.resetToken))) throw invalid;

  user.password = newPassword;
  user.resetToken = null;
  user.resetTokenExpires = null;
  user.lastLoginAt = new Date();
  await user.save();

  // Straight back into a session — asking for a third form (after email and
  // OTP) just to sign in with the password they only just set is friction
  // with no security upside.
  const token = issueSession(res, String(user._id));

  sendOk(res, { token, user: publicUser(user) }, { message: "Password changed" });
});

/* =========================================================
   PROFILE
========================================================= */

/** GET /api/account/me */
export const me = asyncHandler(async (req, res) => {
  const user = await SiteUserModel.findById(req.shopper?.id).lean();
  if (!user) throw ApiError.unauthorized();

  sendOk(res, {
    ...publicUser(user),
    savedCount: user.savedCoupons?.length ?? 0,
    favouriteCount: user.favouriteStores?.length ?? 0,
    alertCount: user.alerts?.length ?? 0,
  });
});

/** PATCH /api/account/me */
export const updateProfile = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof shopperUpdateBody>;

  const user = await SiteUserModel.findByIdAndUpdate(
    req.shopper?.id,
    { $set: body },
    { new: true, runValidators: true }
  ).lean();

  if (!user) throw ApiError.unauthorized();

  sendOk(res, publicUser(user), { message: "Profile updated" });
});

/* =========================================================
   SAVED COUPONS
========================================================= */

/** GET /api/account/saved */
export const listSaved = asyncHandler(async (req, res) => {
  const user = await SiteUserModel.findById(req.shopper?.id)
    .select("savedCoupons")
    .lean();

  if (!user) throw ApiError.unauthorized();

  const coupons = await CouponModel.find({
    _id: { $in: user.savedCoupons ?? [] },
  })
    .populate("store", STORE_CARD_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  sendOk(res, decorateCoupons(coupons));
});

/** POST /api/account/saved/:id — toggles, so one button handles both states. */
export const toggleSaved = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const coupon = await CouponModel.exists({ _id: id });
  if (!coupon) throw ApiError.notFound("That offer is no longer listed");

  const user = await SiteUserModel.findById(req.shopper?.id).select("savedCoupons");
  if (!user) throw ApiError.unauthorized();

  const already = user.savedCoupons.some((saved) => String(saved) === id);

  await SiteUserModel.updateOne(
    { _id: user._id },
    already ? { $pull: { savedCoupons: id } } : { $addToSet: { savedCoupons: id } }
  );

  await CouponModel.updateOne({ _id: id }, { $inc: { saves: already ? -1 : 1 } });

  sendOk(res, { saved: !already }, {
    message: already ? "Removed from your list" : "Saved",
  });
});

/* =========================================================
   FAVOURITE STORES & ALERTS
========================================================= */

/** GET /api/account/favourites */
export const listFavourites = asyncHandler(async (req, res) => {
  const user = await SiteUserModel.findById(req.shopper?.id)
    .select("favouriteStores")
    .lean();

  if (!user) throw ApiError.unauthorized();

  const stores = await StoreModel.find({ _id: { $in: user.favouriteStores ?? [] } })
    .select("name slug logo brandColor activeCouponCount bestOffer")
    .sort({ name: 1 })
    .lean();

  sendOk(res, stores);
});

/** POST /api/account/favourites/:id */
export const toggleFavourite = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const store = await StoreModel.exists({ _id: id });
  if (!store) throw ApiError.notFound("Store not found");

  const user = await SiteUserModel.findById(req.shopper?.id).select("favouriteStores");
  if (!user) throw ApiError.unauthorized();

  const already = user.favouriteStores.some((fav) => String(fav) === id);

  await SiteUserModel.updateOne(
    { _id: user._id },
    already
      ? { $pull: { favouriteStores: id } }
      : { $addToSet: { favouriteStores: id } }
  );

  sendOk(res, { following: !already }, {
    message: already ? "Unfollowed" : "Following",
  });
});

/** GET /api/account/feed — new offers from the stores they follow. */
export const personalFeed = asyncHandler(async (req, res) => {
  const user = await SiteUserModel.findById(req.shopper?.id)
    .select("favouriteStores")
    .lean();

  if (!user) throw ApiError.unauthorized();

  if (!user.favouriteStores?.length) {
    return sendOk(res, [], { meta: { reason: "no-favourites" } });
  }

  const coupons = await CouponModel.find({
    store: { $in: user.favouriteStores },
    ...liveCouponFilter(),
  })
    .sort({ createdAt: -1 })
    .limit(40)
    .populate("store", STORE_CARD_FIELDS)
    .lean();

  sendOk(res, decorateCoupons(coupons));
});
