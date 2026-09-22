const express = require("express");
const router = express.Router();

const store = require("../controllers/store.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

const canPublish = [authMiddleware, adminMiddleware("canPublish")];
const canDelete = [authMiddleware, adminMiddleware("canDelete")];

/* ---------- public ---------- */
router.get("/", store.listStores);
router.get("/letters", store.getLetterCounts);
router.post("/:id/click", store.trackClick);

/* ---------- admin ---------- */
router.post("/", ...canPublish, store.createStore);
router.put("/:id", ...canPublish, store.updateStore);
router.delete("/:id", ...canDelete, store.deleteStore);

/* ---------- catch-all read (last) ---------- */
router.get("/:idOrSlug", store.getStore);

module.exports = router;
