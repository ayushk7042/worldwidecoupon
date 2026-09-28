import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { getBanks, createBank, getBankById } from "../controllers/bankController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", getBanks);
router.get("/:id", getBankById); 
router.post("/", protect, upload.single("logo"), createBank);
export default router;
