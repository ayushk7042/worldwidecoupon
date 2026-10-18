import rateLimit, { type Options } from "express-rate-limit";
import { isTest } from "../config/env.js";
import { sendFail } from "../utils/response.js";

const base = (windowMs: number, limit: number, message: string): Partial<Options> => ({
  windowMs,
  limit: isTest ? 100_000 : limit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => sendFail(res, 429, message),
});

/**
 * Everything under /api, as a blanket safety net.
 *
 * Counted per IP, which in practice means per the frontend's own server —
 * every shopper's page view goes through it, not through their own address.
 * A single homepage render alone fires well over a dozen of these calls, so
 * 1,000/15min sounded generous but was actually only a few dozen real page
 * views before the frontend started rate-limiting itself and the homepage
 * started throwing. 8,000 leaves real headroom for that fan-out while still
 * bounding an actual scraper.
 */
export const generalLimiter = rateLimit(
  base(15 * 60_000, 8_000, "Slow down a moment and try again")
);

/** Sign-in and register — the endpoints worth brute-forcing. */
export const authLimiter = rateLimit({
  ...base(15 * 60_000, 20, "Too many attempts. Try again in a few minutes."),
  skipSuccessfulRequests: true,
});

/**
 * Reveal and redirect. Generous, because a real shopper genuinely clicks a lot
 * of codes in one session, but low enough to make bulk scraping tedious.
 */
export const revealLimiter = rateLimit(
  base(60_000, 60, "That is a lot of codes at once — take a breath")
);

/** Contact form and votes, where one person should not be able to spam. */
export const writeLimiter = rateLimit(
  base(60 * 60_000, 30, "You have sent a few of those already today")
);
