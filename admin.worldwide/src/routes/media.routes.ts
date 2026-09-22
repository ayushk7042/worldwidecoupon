import { Router } from "express";
import { upload } from "../config/upload.js";
import * as media from "../controllers/media.controller.js";
import { canDelete, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam } from "../validators/common.js";

const router = Router();

router.use(requireAdmin);

router.get("/", media.listMedia);
router.post("/upload", upload.array("files", 30), media.uploadMedia);
router.post("/register", media.registerMedia);

router.patch("/:id", validate({ params: idParam }), media.updateMedia);
router.delete("/:id", ...canDelete, validate({ params: idParam }), media.deleteMedia);

export default router;
