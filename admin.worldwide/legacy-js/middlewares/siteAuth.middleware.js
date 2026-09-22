const jwt = require("jsonwebtoken");
const SiteUser = require("../models/SiteUser");

/**
 * Shopper sessions, kept apart from the admin panel.
 *
 * Admin tokens and shopper tokens are both signed with the same secret, so the
 * `kind` claim is what stops one being used as the other.
 */
const resolve = async (req) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.siteToken;
  if (!token) return null;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.kind !== "site") return null;

  const user = await SiteUser.findById(decoded.id).select("_id status");
  if (!user || user.status !== "active") return null;

  return { id: String(user._id) };
};

exports.siteAuth = async (req, res, next) => {
  try {
    const user = await resolve(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Please sign in" });
    }

    req.siteUser = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Your session has expired" });
  }
};

/** Lets a page render either way, but knows the shopper when there is one. */
exports.optionalSiteAuth = async (req, _res, next) => {
  try {
    req.siteUser = await resolve(req);
  } catch {
    req.siteUser = null;
  }
  next();
};
