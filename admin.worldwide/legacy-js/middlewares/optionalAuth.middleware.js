const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

/**
 * Decodes a token when one is present but never rejects the request.
 * Lets public endpoints return extra data (drafts, scheduled posts) to a
 * logged-in admin without a second set of routes.
 */
module.exports.optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (admin) req.admin = admin;
  } catch {
    // invalid/expired token on a public route is simply "not logged in"
  }

  next();
};
