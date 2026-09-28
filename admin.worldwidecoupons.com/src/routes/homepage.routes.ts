import { Router } from "express";
import * as homepage from "../controllers/homepage.controller.js";
import { canPublish, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", homepage.getHomepage);

router.get("/config", requireAdmin, homepage.getConfig);
router.put("/config", ...canPublish, homepage.updateConfig);

export default router;
