const express = require("express");
const router = express.Router();

const { upload } = require("../config/upload");
const media = require("../controllers/media.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

// Everything in the media library is admin-only.
router.use(authMiddleware);

/* ---------- read ---------- */
router.get("/", adminMiddleware(), media.listMedia);
router.get("/folders", adminMiddleware(), media.listFolders);
router.get("/:id", adminMiddleware(), media.getMedia);

/* ---------- upload ---------- */
router.post(
  "/upload",
  adminMiddleware("canPublish"),
  upload.single("file"),
  media.uploadSingle
);

router.post(
  "/upload-multiple",
  adminMiddleware("canPublish"),
  upload.array("files", 30),
  media.uploadMultiple
);

router.post("/register", adminMiddleware("canPublish"), media.registerExternal);

/* ---------- update ---------- */
router.put("/:id", adminMiddleware("canPublish"), media.updateMedia);

router.put(
  "/:id/replace",
  adminMiddleware("canPublish"),
  upload.single("file"),
  media.replaceMedia
);

/* ---------- delete ---------- */
router.post("/bulk-delete", adminMiddleware("canDelete"), media.bulkDeleteMedia);
router.delete("/:id", adminMiddleware("canDelete"), media.deleteMedia);

module.exports = router;
