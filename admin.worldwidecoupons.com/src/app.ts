import compression from "compression";
import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, isProduction } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { generalLimiter } from "./middlewares/rateLimit.middleware.js";
import routes from "./routes/index.js";

const app = express();

// Behind a proxy, `req.ip` is the load balancer unless Express is told to
// trust the forwarded header — which the rate limiter depends on being right.
if (env.TRUST_PROXY) app.set("trust proxy", 1);

app.disable("x-powered-by");

/* =========================================================
   SECURITY & TRANSPORT
========================================================= */

app.use(
  helmet({
    // The API serves JSON and redirects, never HTML, so CSP has nothing to
    // protect here and only breaks the Swagger-style tools people point at it.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(compression());
app.use(cookieParser());

/**
 * Vite picks the next free port whenever the usual one is busy, so pinning
 * the dev origins to a fixed list means the API starts silently refusing the
 * browser on :5175. Outside production any loopback port is fine — nothing on
 * the public internet can present a localhost origin.
 */
const corsOptions: CorsOptions = {
  origin(origin, done) {
    if (!origin) return done(null, true); // curl, health checks, server-to-server

    if (env.CORS_ORIGINS.includes(origin)) return done(null, true);

    if (
      !isProduction &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return done(null, true);
    }

    return done(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Store "about" blocks are full rich-text HTML, so the default 100 kb cap is
// too low for a realistic save from the editor.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (env.ENABLE_REQUEST_LOG) {
  app.use(morgan(isProduction ? "combined" : "dev"));
}

/* =========================================================
   ROUTES
========================================================= */

app.use("/api", generalLimiter, routes);

app.get("/", (_req, res) => {
  res.json({
    name: `${env.SITE_NAME} API`,
    version: "2.0.0",
    docs: "/api/health",
  });
});

/* =========================================================
   ERROR HANDLING (always last)
========================================================= */

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
