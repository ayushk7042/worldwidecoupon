// import express from "express";
// import { protect } from "../middleware/authMiddleware.js";
// import upload from "../middleware/uploadMiddleware.js";
// import { getNews, getNewsById, createNews, updateNews, deleteNews } from "../controllers/newsController.js";

// const router = express.Router();

// router.get("/", getNews);
// router.get("/:id", getNewsById);

// // Protected routes (admin only)
// router.post("/", protect, upload.single("image"), createNews);
// router.put("/:id", protect, upload.single("image"), updateNews);
// router.delete("/:id", protect, deleteNews);

// export default router;
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  getNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
} from "../controllers/newsController.js";

const router = express.Router();

// Public routes
router.get("/", getNews);
router.get("/:id", getNewsById);

// Protected admin routes
router.post("/", protect, upload.single("image"), createNews);
router.put("/:id", protect, upload.single("image"), updateNews);
router.delete("/:id", protect, deleteNews);

export default router;
