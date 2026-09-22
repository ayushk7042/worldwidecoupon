const express = require("express");
const router = express.Router();

const account = require("../controllers/account.controller");
const { siteAuth } = require("../middlewares/siteAuth.middleware");

/* ---------- open ---------- */
router.post("/register", account.register);
router.post("/login", account.login);

/* ---------- signed in ---------- */
router.get("/me", siteAuth, account.me);
router.put("/me", siteAuth, account.updateProfile);
router.put("/password", siteAuth, account.changePassword);

router.post("/stores/:id/toggle", siteAuth, account.toggleStore);
router.post("/coupons/:id/toggle", siteAuth, account.toggleCoupon);

module.exports = router;
