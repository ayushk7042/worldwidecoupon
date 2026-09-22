const express = require("express");
const multer = require("multer");
const router = express.Router();

const imports = require("../controllers/import.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

// Sheets are parsed in memory — they never touch Cloudinary or disk.
const sheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB ~ comfortably past 5000 rows
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xlsm|csv)$/i.test(file.originalname);
    if (!ok) return cb(new Error("Upload an .xlsx or .csv file"));
    cb(null, true);
  },
});

router.use(authMiddleware);

/* ---------- templates & export ---------- */
router.get("/sample", adminMiddleware(), imports.downloadSample);
router.get("/export", adminMiddleware(), imports.exportArticles);

/* ---------- history (before /:batchId) ---------- */
router.get("/history", adminMiddleware(), imports.importHistory);

/* ---------- validate & run ---------- */
router.post(
  "/validate",
  adminMiddleware("canPublish"),
  sheetUpload.single("file"),
  imports.validateSheet
);

router.post(
  "/run",
  adminMiddleware("canPublish"),
  sheetUpload.single("file"),
  imports.runImportSheet
);

/* ---------- per-batch ---------- */
router.post("/:batchId/rollback", adminMiddleware("canDelete"), imports.rollbackImport);
router.get("/:batchId", adminMiddleware(), imports.importStatus);

module.exports = router;
