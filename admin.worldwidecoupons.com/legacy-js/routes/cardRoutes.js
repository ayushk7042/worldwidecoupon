// import express from "express";
// import upload from "../middleware/uploadMiddleware.js";
// import { protect } from "../middleware/authMiddleware.js";
// import { getCards, createCard, getCardById } from "../controllers/cardController.js";
// import Card from "../models/Card.js";

// const router = express.Router();
// router.get("/", getCards);
// router.get("/:id", getCardById); 
// //router.post("/", protect, createCard);
// router.post("/", protect, upload.single("image"), createCard);
// export default router;

import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getCards, 
  createCard, 
  getCardById, 
  updateCard, 
  deleteCard 
} from "../controllers/cardController.js";

const router = express.Router();

// Public routes
router.get("/", getCards);
router.get("/:id", getCardById);

// Admin routes (protected)
router.post("/", protect, upload.single("image"), createCard);
router.put("/:id", protect, upload.single("image"), updateCard);
router.delete("/:id", protect, deleteCard);

//router.post("/", protect, createCard);

export default router;
