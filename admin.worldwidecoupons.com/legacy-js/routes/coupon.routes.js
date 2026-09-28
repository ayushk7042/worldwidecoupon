const express = require("express");
const router = express.Router();

const coupon = require("../controllers/coupon.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

const canPublish = [authMiddleware, adminMiddleware("canPublish")];
const canDelete = [authMiddleware, adminMiddleware("canDelete")];

/* ---------- public ---------- */
router.get("/", coupon.listCoupons);
router.get("/homefeed", coupon.getHomeFeed);
router.post("/:id/reveal", coupon.revealCoupon);
router.post("/:id/vote", coupon.voteCoupon);

/* ---------- admin (literal paths before /:idOrSlug) ---------- */
router.post("/bulk/status", ...canPublish, coupon.bulkStatus);
router.post("/expire-due", ...canPublish, coupon.expireDue);
router.post("/", ...canPublish, coupon.createCoupon);

router.patch("/:id/status", ...canPublish, coupon.changeStatus);
router.put("/:id", ...canPublish, coupon.updateCoupon);
router.delete("/:id", ...canDelete, coupon.deleteCoupon);

/* ---------- catch-all read (last) ---------- */
router.get("/:idOrSlug", coupon.getCoupon);

module.exports = router;
