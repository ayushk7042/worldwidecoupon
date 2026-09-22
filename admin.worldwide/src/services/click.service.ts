import type { Request } from "express";
import { ClickEventModel, type ClickKind } from "../models/ClickEvent.js";
import { CouponModel, type CouponDocument } from "../models/Coupon.js";
import { StoreModel, type StoreDocument } from "../models/Store.js";
import { idOf } from "../utils/objectId.js";
import { withTracking } from "../utils/url.js";

/** Keeps the network, drops the household. */
function ipPrefix(req: Request): string | undefined {
  const ip = req.ip ?? "";
  if (!ip) return undefined;

  if (ip.includes(":")) {
    // IPv6 — first four hextets is roughly a /64.
    return `${ip.split(":").slice(0, 4).join(":")}::`;
  }

  const parts = ip.split(".");
  if (parts.length !== 4) return undefined;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

/**
 * Where a shopper should actually land.
 *
 * Precedence is deliberate: a coupon's own `destinationUrl` wins because it is
 * the deep link the offer was written for, then the store's affiliate link,
 * then the plain homepage. Tracking is applied last so the coupon-level link
 * gets it too.
 */
export function resolveDestination(
  coupon: Pick<CouponDocument, "destinationUrl" | "landingUrl"> | null,
  store: Pick<StoreDocument, "affiliateUrl" | "websiteUrl" | "trackingParams"> | null
): string {
  const couponLink = coupon?.destinationUrl || coupon?.landingUrl;
  if (couponLink) return withTracking(couponLink, store?.trackingParams);

  if (!store) return "";
  return withTracking(store.affiliateUrl || store.websiteUrl, store.trackingParams);
}

interface RecordArgs {
  req: Request;
  kind: ClickKind;
  storeId: unknown;
  couponId?: unknown;
  destinationUrl: string;
}

/**
 * Writes the audit row and bumps the counters.
 *
 * Deliberately fire-and-forget at the call site: a shopper must never wait on,
 * or be blocked by, analytics. A failed write loses one click, not a sale.
 */
export async function recordClick({
  req,
  kind,
  storeId,
  couponId,
  destinationUrl,
}: RecordArgs): Promise<void> {
  const store = idOf(storeId);
  if (!store || !destinationUrl) return;

  const coupon = idOf(couponId);

  const writes: Promise<unknown>[] = [
    ClickEventModel.create({
      kind,
      store,
      coupon,
      shopper: idOf(req.shopper?.id),
      destinationUrl,
      referrer: String(req.headers.referer ?? "").slice(0, 500) || undefined,
      userAgent: String(req.headers["user-agent"] ?? "").slice(0, 400) || undefined,
      ipPrefix: ipPrefix(req),
    }),
    StoreModel.updateOne({ _id: store }, { $inc: { clicks: 1 } }),
  ];

  if (coupon) {
    // A reveal is both a click and a use; a plain deal click is only a click.
    const increments: Record<string, number> =
      kind === "reveal" ? { clicks: 1, uses: 1 } : { clicks: 1 };

    writes.push(CouponModel.updateOne({ _id: coupon }, { $inc: increments }));
  }

  await Promise.allSettled(writes);
}
