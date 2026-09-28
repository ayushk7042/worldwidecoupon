import express from "express";
import { registerAdmin, loginAdmin, logoutAdmin, getMe } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerAdmin); // you can remove register endpoint in prod
router.post("/login", loginAdmin);
router.post("/logout", logoutAdmin);
router.get("/me", getMe);

export default router;
