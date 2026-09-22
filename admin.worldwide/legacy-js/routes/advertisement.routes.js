const express = require("express");
const router = express.Router();

const ads = require("../controllers/advertisement.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

const canPublish = [authMiddleware, adminMiddleware("canPublish")];
const canDelete = [authMiddleware, adminMiddleware("canDelete")];

/* ---------- public ---------- */
router.get("/serve", ads.serveAds);
router.post("/:id/impression", ads.trackImpression);
router.post("/:id/click", ads.trackClick);

/* ---------- admin ---------- */
router.get("/", ...canPublish, ads.listAds);
router.post("/", ...canPublish, ads.createAd);
router.put("/:id", ...canPublish, ads.updateAd);
router.delete("/:id", ...canDelete, ads.deleteAd);

module.exports = router;
