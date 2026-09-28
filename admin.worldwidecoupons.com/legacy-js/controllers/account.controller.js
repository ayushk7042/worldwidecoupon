const jwt = require("jsonwebtoken");
const SiteUser = require("../models/SiteUser");

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

const sign = (user) =>
  jwt.sign({ id: user._id, kind: "site" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });

/** Never send the password hash or reset fields back to the browser. */
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  newsletter: user.newsletter,
  favouriteStores: user.favouriteStores || [],
  savedCoupons: user.savedCoupons || [],
  createdAt: user.createdAt,
});

/* =========================================================
   AUTH
========================================================= */

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Name, email and password are required" });
    }

    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ success: false, message: "Use at least 8 characters for your password" });
    }

    const exists = await SiteUser.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "An account with that email already exists" });
    }

    const user = await SiteUser.create({ name, email, password });

    res.status(201).json({ success: true, token: sign(user), data: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await SiteUser.findOne({ email: String(email || "").toLowerCase() }).select(
      "+password"
    );

    // the same message either way, so the form cannot be used to find real emails
    if (!user || !(await user.matchesPassword(String(password || "")))) {
      return res.status(401).json({ success: false, message: "Email or password is wrong" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ success: false, message: "This account is suspended" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.json({ success: true, token: sign(user), data: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await SiteUser.findById(req.siteUser?.id)
      .populate("favouriteStores", "name slug logo activeCouponCount brandColor")
      .populate({
        path: "savedCoupons",
        populate: { path: "store", select: "name slug logo brandColor" },
      });

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const patch = {};

    ["name", "avatar"].forEach((key) => {
      if (req.body[key] !== undefined) patch[key] = String(req.body[key]).trim();
    });

    if (req.body.newsletter !== undefined) patch.newsletter = Boolean(req.body.newsletter);

    const user = await SiteUser.findByIdAndUpdate(
      req.siteUser?.id,
      { $set: patch },
      { new: true }
    );

    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current, next: nextPassword } = req.body;

    if (String(nextPassword || "").length < 8) {
      return res
        .status(400)
        .json({ success: false, message: "Use at least 8 characters for your password" });
    }

    const user = await SiteUser.findById(req.siteUser?.id).select("+password");

    if (!user || !(await user.matchesPassword(String(current || "")))) {
      return res.status(401).json({ success: false, message: "Your current password is wrong" });
    }

    user.password = nextPassword;
    await user.save();

    res.json({ success: true, message: "Password changed" });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   SAVED THINGS
========================================================= */

/** Adds when missing, removes when present — one endpoint for both. */
const toggle = (field) => async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ success: false, message: "Bad id" });
    }

    const user = await SiteUser.findById(req.siteUser?.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const list = user[field] || [];
    const has = list.some((item) => String(item) === String(id));

    user[field] = has
      ? list.filter((item) => String(item) !== String(id))
      : [...list, id];

    await user.save();

    res.json({ success: true, data: { saved: !has, [field]: user[field] } });
  } catch (err) {
    next(err);
  }
};

exports.toggleStore = toggle("favouriteStores");
exports.toggleCoupon = toggle("savedCoupons");
