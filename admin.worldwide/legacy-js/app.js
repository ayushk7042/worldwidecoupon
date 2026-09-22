const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const app = express();
const errorHandler = require("./middlewares/error.middleware");

/* =========================
   MIDDLEWARES
========================= */

app.use(compression());
app.use(cookieParser());

const ALLOWED_ORIGINS = [
  "https://thesavingdeck.com",
  "https://www.thesavingdeck.com",
  "https://admin.thesavingdeck.com",
];

/**
 * Vite moves to the next free port whenever the usual one is busy, so pinning
 * the dev origins to a list means the API silently starts refusing the browser
 * on 5175. Outside production, any loopback port is fine — nothing on the
 * public internet can present a localhost origin.
 */
const isAllowedOrigin = (origin, done) => {
  if (!origin) return done(null, true); // curl, health checks, server-to-server

  if (ALLOWED_ORIGINS.includes(origin)) return done(null, true);

  if (
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return done(null, true);
  }

  return done(null, false);
};

app.use(
  cors({
    origin: isAllowedOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Articles carry full rich-text HTML, so the default 100 kb body cap is too low.
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

/* =========================
   ROUTES
========================= */

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

/* ---- existing ---- */
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/contact", require("./routes/contact.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/news", require("./routes/news.routes"));
app.use("/api/homepage", require("./routes/homepage.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/auto-news", require("./routes/autoNews.routes"));

/* ---- added ---- */
app.use("/api/tags", require("./routes/tag.routes"));
app.use("/api/media", require("./routes/media.routes"));
app.use("/api/ads", require("./routes/advertisement.routes"));
app.use("/api/import", require("./routes/import.routes"));

/* ---- coupons ---- */
app.use("/api/stores", require("./routes/store.routes"));
app.use("/api/coupons", require("./routes/coupon.routes"));
app.use("/api/account", require("./routes/account.routes"));

/* =========================
   ERROR HANDLER (LAST)
========================= */

// Multer rejects oversized or wrong-typed uploads with its own error class;
// translate those into a clean 400 instead of a 500.
app.use((err, req, res, next) => {
  if (err && (err.name === "MulterError" || /file|upload/i.test(err.message || ""))) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

app.use(errorHandler);

module.exports = app;
