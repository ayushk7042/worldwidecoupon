import { Router } from "express";
import * as tag from "../controllers/tag.controller.js";
import { canDelete, canPublish } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam, slugParam } from "../validators/common.js";

const router = Router();

router.get("/", tag.listTags);

router.post("/refresh-counts", ...canPublish, tag.refreshTagCounts);
router.post("/", ...canPublish, tag.createTag);
router.put("/:id", ...canPublish, validate({ params: idParam }), tag.updateTag);
router.delete("/:id", ...canDelete, validate({ params: idParam }), tag.deleteTag);

router.get("/:idOrSlug", validate({ params: slugParam }), tag.getTag);

export default router;
