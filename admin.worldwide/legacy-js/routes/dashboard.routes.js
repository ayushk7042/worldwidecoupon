const express = require("express");
const router = express.Router();

const { getDashboardData } = require("../controllers/dashboard.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

router.get(
  "/",
  authMiddleware,
  adminMiddleware(),
  getDashboardData
);

module.exports = router;
