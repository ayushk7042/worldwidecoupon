const express = require("express");
const router = express.Router();

const category = require("../controllers/category.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");
const { optionalAuth } = require("../middlewares/optionalAuth.middleware");

const canPublish = [authMiddleware, adminMiddleware("canPublish")];
const canDelete = [authMiddleware, adminMiddleware("canDelete")];

/* ---------- public ---------- */
router.get("/", optionalAuth, category.getCategories); // legacy: bare array
router.get("/tree", category.getCategoryTree);

/* ---------- admin writes (literal paths before /:id) ---------- */
router.post("/reorder", ...canPublish, category.reorderCategories);
router.post("/", ...canPublish, category.createCategory);

router.patch("/:id/visibility", ...canPublish, category.toggleVisibility);
router.put("/:id", ...canPublish, category.updateCategory);
router.delete("/:id", ...canDelete, category.deleteCategory);

/* ---------- catch-all read (last) ---------- */
router.get("/:idOrSlug", category.getCategory);

module.exports = router;
