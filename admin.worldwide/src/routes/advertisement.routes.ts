import { Router } from "express";
import * as ads from "../controllers/advertisement.controller.js";
import { canDelete, canPublish, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam } from "../validators/common.js";

const router = Router();

/* ---------- public ---------- */

router.get("/serve", ads.serveAd);
router.get("/serve-list", ads.serveAdList);
router.post("/:id/click", validate({ params: idParam }), ads.trackAdClick);

/* ---------- admin ---------- */

router.get("/", requireAdmin, ads.listAds);
router.post("/", ...canPublish, ads.createAd);
router.put("/:id", ...canPublish, validate({ params: idParam }), ads.updateAd);
router.delete("/:id", ...canDelete, validate({ params: idParam }), ads.deleteAd);

export default router;
