const express = require("express");
const router = express.Router();

const {
  getHomepage,
  updateHomepage
} = require("../controllers/homepage.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

// Public
router.get("/", getHomepage);

// Admin
router.put(
  "/",
  authMiddleware,
  adminMiddleware("canPublish"),
  updateHomepage
);

module.exports = router;
