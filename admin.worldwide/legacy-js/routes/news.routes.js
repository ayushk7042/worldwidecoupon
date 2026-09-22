const express = require("express");
const router = express.Router();

const news = require("../controllers/news.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");
const { optionalAuth } = require("../middlewares/optionalAuth.middleware");

const canPublish = [authMiddleware, adminMiddleware("canPublish")];
const canDelete = [authMiddleware, adminMiddleware("canDelete")];

/* =========================================================
   PUBLIC READS
   NOTE: every literal path must be declared before "/:slug",
   otherwise the slug route swallows it.
========================================================= */

router.get("/", optionalAuth, news.getNews);          // legacy: bare array
router.get("/list", optionalAuth, news.listNews);     // paginated
router.get("/search", optionalAuth, news.searchNews);
router.get("/homefeed", optionalAuth, news.getHomeFeed);
router.get("/facets", news.getFacets);
router.get("/related/:slug", optionalAuth, news.getRelatedNews);
router.get("/id/:id", authMiddleware, news.getNewsById);

/* =========================================================
   WRITES
========================================================= */

router.post("/", ...canPublish, news.createNews);

/* ---------- bulk (before /:id routes) ---------- */
router.post("/bulk/status", ...canPublish, news.bulkStatus);
router.post("/bulk/category", ...canPublish, news.bulkCategory);
router.post("/bulk/tags", ...canPublish, news.bulkTags);
router.post("/bulk/flags", ...canPublish, news.bulkFlags);
router.post("/bulk/delete", ...canDelete, news.bulkDelete);

/* ---------- engagement (public) ---------- */
router.post("/:slug/like", news.likeNews);
router.post("/:slug/share", news.shareNews);

/* ---------- single-document admin actions ---------- */
router.post("/:id/duplicate", ...canPublish, news.duplicateNews);
router.post("/:id/restore", ...canPublish, news.restoreNews);
router.post("/:id/trash", ...canDelete, news.trashNews);

router.patch("/:id/status", ...canPublish, news.changeStatus);

router.put("/id/:id", ...canPublish, news.updateNewsById);
router.put("/:slug", ...canPublish, news.updateNews);   // legacy

router.delete("/:id", ...canDelete, news.deleteNews);

/* =========================================================
   CATCH-ALL SLUG READ (must stay last)
========================================================= */

router.get("/:slug", optionalAuth, news.getNewsBySlug);

module.exports = router;
