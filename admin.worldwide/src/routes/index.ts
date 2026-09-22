import { Router } from "express";
import mongoose from "mongoose";
import accountRoutes from "./account.routes.js";
import advertisementRoutes from "./advertisement.routes.js";
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import contactRoutes from "./contact.routes.js";
import couponRoutes from "./coupon.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import homepageRoutes from "./homepage.routes.js";
import importRoutes from "./import.routes.js";
import mediaRoutes from "./media.routes.js";
import searchRoutes from "./search.routes.js";
import storeRoutes from "./store.routes.js";
import tagRoutes from "./tag.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];

  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    database: states[mongoose.connection.readyState] ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});

/* ---------- the coupon domain ---------- */
router.use("/coupons", couponRoutes);
router.use("/stores", storeRoutes);
router.use("/categories", categoryRoutes);
router.use("/tags", tagRoutes);
router.use("/search", searchRoutes);
router.use("/homepage", homepageRoutes);

/* ---------- people ---------- */
router.use("/auth", authRoutes);
router.use("/account", accountRoutes);
router.use("/contact", contactRoutes);

/* ---------- back office ---------- */
router.use("/dashboard", dashboardRoutes);
router.use("/media", mediaRoutes);
router.use("/ads", advertisementRoutes);
router.use("/import", importRoutes);

export default router;
