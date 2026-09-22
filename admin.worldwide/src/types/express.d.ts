import type { AdminDocument } from "../models/Admin.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAdmin` / `optionalAdmin` — the CMS operator. */
      admin?: AdminDocument | null;

      /** Set by `requireShopper` / `optionalShopper` — a signed-in shopper. */
      shopper?: { id: string } | null;
    }
  }
}

export {};
