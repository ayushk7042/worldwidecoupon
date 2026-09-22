import { Router } from "express";
import * as coupon from "../controllers/coupon.controller.js";
import {
  canDelete,
  canPublish,
  optionalAdmin,
} from "../middlewares/auth.middleware.js";
import { revealLimiter, writeLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam, slugParam } from "../validators/common.js";
import {
  bulkDeleteBody,
  bulkStatusBody,
  createCouponBody,
  listCouponsQuery,
  statusBody,
  updateCouponBody,
  voteBody,
} from "../validators/coupon.validator.js";

const router = Router();

/* ---------- public reads ---------- */

router.get(
  "/",
  optionalAdmin,
  validate({ query: listCouponsQuery }),
  coupon.listCoupons
);

router.get("/feed", coupon.getFeed);

/* ---------- shopper actions ---------- */

router.post(
  "/:id/reveal",
  revealLimiter,
  validate({ params: idParam }),
  coupon.revealCoupon
);

router.get("/:id/go", revealLimiter, validate({ params: idParam }), coupon.goToDeal);

router.post(
  "/:id/vote",
  writeLimiter,
  validate({ params: idParam, body: voteBody }),
  coupon.voteCoupon
);

/* ---------- admin writes ----------
   Literal paths are declared before `/:idOrSlug` so "bulk" and "feed" are
   never swallowed by the catch-all slug route. */

router.post(
  "/bulk/status",
  ...canPublish,
  validate({ body: bulkStatusBody }),
  coupon.bulkStatus
);

router.post(
  "/bulk/delete",
  ...canDelete,
  validate({ body: bulkDeleteBody }),
  coupon.bulkDelete
);

router.post("/", ...canPublish, validate({ body: createCouponBody }), coupon.createCoupon);

router.patch(
  "/:id/status",
  ...canPublish,
  validate({ params: idParam, body: statusBody }),
  coupon.changeStatus
);

router.post(
  "/:id/verify",
  ...canPublish,
  validate({ params: idParam }),
  coupon.verifyCoupon
);

router.put(
  "/:id",
  ...canPublish,
  validate({ params: idParam, body: updateCouponBody }),
  coupon.updateCoupon
);

router.delete("/:id", ...canDelete, validate({ params: idParam }), coupon.deleteCoupon);

/* ---------- catch-all reads (last) ---------- */

router.get(
  "/:idOrSlug/related",
  validate({ params: slugParam }),
  coupon.getRelated
);

router.get(
  "/:idOrSlug",
  optionalAdmin,
  validate({ params: slugParam }),
  coupon.getCoupon
);

export default router;
