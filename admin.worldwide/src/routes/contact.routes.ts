import { Router } from "express";
import * as contact from "../controllers/contact.controller.js";
import { canDelete, requireAdmin } from "../middlewares/auth.middleware.js";
import { writeLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam } from "../validators/common.js";
import { contactBody, contactReplyBody } from "../validators/auth.validator.js";

const router = Router();

router.post("/", writeLimiter, validate({ body: contactBody }), contact.submit);

/* ---------- admin inbox ---------- */

router.get("/", requireAdmin, contact.list);
router.get("/:id", requireAdmin, validate({ params: idParam }), contact.getOne);

router.post(
  "/:id/reply",
  requireAdmin,
  validate({ params: idParam, body: contactReplyBody }),
  contact.reply
);

router.patch(
  "/:id/status",
  requireAdmin,
  validate({ params: idParam }),
  contact.changeStatus
);

router.delete("/:id", ...canDelete, validate({ params: idParam }), contact.remove);

export default router;
