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

/** Everything under /api, as a blanket safety net. */
export const generalLimiter = rateLimit(
  base(15 * 60_000, 1_000, "Slow down a moment and try again")
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
