const express = require("express");
const router = express.Router();

const tag = require("../controllers/tag.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");
const { optionalAuth } = require("../middlewares/optionalAuth.middleware");

const canPublish = [authMiddleware, adminMiddleware("canPublish")];
const canDelete = [authMiddleware, adminMiddleware("canDelete")];

/* ---------- public ---------- */
router.get("/", optionalAuth, tag.listTags);

/* ---------- admin (literal paths first) ---------- */
router.post("/merge", ...canPublish, tag.mergeTags);
router.post("/recount", ...canPublish, tag.recountTags);
router.post("/bulk-delete", ...canDelete, tag.bulkDeleteTags);
router.post("/", ...canPublish, tag.createTag);

router.put("/:id", ...canPublish, tag.updateTag);
router.delete("/:id", ...canDelete, tag.deleteTag);

/* ---------- catch-all read ---------- */
router.get("/:idOrSlug", tag.getTag);

module.exports = router;
