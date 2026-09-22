import { Router } from "express";
import * as dashboard from "../controllers/dashboard.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAdmin);

router.get("/", dashboard.getStats);
router.get("/top", dashboard.getTopPerformers);
router.get("/attention", dashboard.getAttentionList);

export default router;
