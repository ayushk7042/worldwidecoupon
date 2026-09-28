import { Router } from "express";
import * as account from "../controllers/account.controller.js";
import { requireShopper } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam } from "../validators/common.js";
import {
  shopperLoginBody,
  shopperRegisterBody,
  shopperUpdateBody,
} from "../validators/auth.validator.js";

const router = Router();

/* ---------- session ---------- */

router.post(
  "/register",
  authLimiter,
  validate({ body: shopperRegisterBody }),
  account.register
);

router.post("/login", authLimiter, validate({ body: shopperLoginBody }), account.login);
router.post("/logout", account.logout);

/* ---------- everything below needs a signed-in shopper ---------- */

router.use(requireShopper);

router.get("/me", account.me);
router.patch("/me", validate({ body: shopperUpdateBody }), account.updateProfile);

router.get("/saved", account.listSaved);
router.post("/saved/:id", validate({ params: idParam }), account.toggleSaved);

router.get("/favourites", account.listFavourites);
router.post("/favourites/:id", validate({ params: idParam }), account.toggleFavourite);

router.get("/feed", account.personalFeed);

export default router;
