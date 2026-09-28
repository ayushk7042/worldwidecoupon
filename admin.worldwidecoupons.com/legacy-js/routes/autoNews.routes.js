const express = require("express");
const router = express.Router();

const { runAutoNews } = require("../controllers/autoNews.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

router.post(
  "/run",
  authMiddleware,
  adminMiddleware("canPublish"),
  runAutoNews
);

module.exports = router;
