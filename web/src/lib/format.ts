import type { Coupon, CouponView, ImageRef, Store } from "./types";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
};

export const currencySymbol = (code = "USD"): string => CURRENCY_SYMBOLS[code] ?? "$";

/** 1,718 — never 1718. Compact above ten thousand: 12.4k. */
export function formatCount(value: number | undefined | null): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (n >= 10_000) {
    return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return n.toLocaleString("en-US");
}

/** "2 days ago", "just now" — for anything inside the last month. */
export function timeAgo(input?: string | Date | null): string {
  if (!input) return "";

  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;

  const days = Math.floor(seconds / 86_400);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (days < 365) return months === 1 ? "a month ago" : `${months} months ago`;

  const years = Math.floor(days / 365);
  return years === 1 ? "a year ago" : `${years} years ago`;
}

export function formatDate(input?: string | Date | null): string {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(input?: string | Date | null): string {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";

  return `${formatDate(date)}, ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/**
 * The urgency line under an offer.
 *
 * Deliberately says nothing when an offer never expires: a fake "ends soon"
 * is the fastest way to lose a shopper's trust for good.
 */
export function expiryLabel(coupon: Pick<CouponView, "neverExpires" | "expiresAt" | "expiresIn">): string | null {
  if (coupon.neverExpires || !coupon.expiresAt) return null;

  const days = coupon.expiresIn;
  if (days === null || days === undefined) return null;

  if (days <= 0) return "Expired";
  if (days === 1) return "Ends today";
  if (days === 2) return "Ends tomorrow";
  if (days <= 7) return `${days} days left`;

  return `Ends ${formatDate(coupon.expiresAt)}`;
}

export const isUrgent = (coupon: Pick<CouponView, "neverExpires" | "expiresIn">): boolean =>
  !coupon.neverExpires && coupon.expiresIn !== null && coupon.expiresIn <= 3;

/** Human label for the offer type, used on filters and badges. */
export const COUPON_TYPE_LABELS: Record<Coupon["type"], string> = {
  code: "Promo code",
  deal: "Deal",
  freeshipping: "Free shipping",
  bogo: "Buy one get one",
  cashback: "Cashback",
  giftcard: "Gift card",
  printable: "In-store code",
};

export const COUPON_SORT_LABELS: Record<string, string> = {
  best: "Best match",
  newest: "Newest first",
  expiring: "Ending soonest",
  popular: "Most used",
  discount: "Biggest saving",
  alphabetical: "A–Z",
};

/** The store on a coupon is populated on reads and a bare id on writes. */
export function storeOf(coupon: Pick<Coupon, "store">): Store | null {
  return typeof coupon.store === "object" && coupon.store !== null
    ? (coupon.store as Store)
    : null;
}

export function imageUrl(image?: ImageRef | string | null): string | null {
  if (!image) return null;
  if (typeof image === "string") return image || null;
  return image.thumbnailUrl || image.url || null;
}

/** Initials for the fallback tile when a store has no usable logo. */
export function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * A stable colour per store, so the fallback tile looks deliberate rather
 * than random and does not change between renders.
 */
const TILE_COLOURS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#a855f7", "#14b8a6",
];

export function tileColour(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TILE_COLOURS[hash % TILE_COLOURS.length]!;
}

/** Trims a description to one clean line for a card. */
export function firstLine(text?: string | null, max = 120): string {
  if (!text) return "";
  const line = text.split("\n").find((part) => part.trim().length > 0) ?? "";
  const clean = line.trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function descriptionLines(text?: string | null, max = 4): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

export const classNames = (...values: (string | false | null | undefined)[]): string =>
  values.filter(Boolean).join(" ");

/**
 * The badge reads "50% OFF" or "$5 OFF", and a hero wants the number loud and
 * the rest quiet, so it is split on the first space.
 */
export function splitBadge(badge: string): { lead: string; tail: string } {
  const match = badge.trim().match(/^(\S+)\s+(.*)$/);
  return match ? { lead: match[1] ?? badge, tail: match[2] ?? "" } : { lead: badge, tail: "" };
}

/**
 * The artwork for a category page header: the editor's own header image when
 * there is one, otherwise the right-hand ~47% of the category's homepage
 * banner (its products, without the headline drawn on the left) — cut by
 * Cloudinary at delivery time, so an uploaded banner works with no re-crop.
 */
export function categoryHeaderArt(category: {
  headerImage?: ImageRef | null;
  banner?: ImageRef | null;
}): { url: string; ratio: number } | null {
  const own = category.headerImage;
  if (own?.url) {
    return { url: own.url, ratio: own.width && own.height ? own.width / own.height : 10 / 3 };
  }

  const banner = category.banner;
  if (banner?.url && banner.url.includes("/upload/")) {
    const ratio = banner.width && banner.height ? (banner.width * 0.47) / banner.height : 1.4;
    return { url: banner.url.replace("/upload/", "/upload/c_crop,g_east,w_0.47,h_1.0/"), ratio };
  }

  return null;
}

/**
 * A colour per category, grouped the way the site owner wants them to read —
 * accessories/clothing/shipping green, electronics/travel/sport/medical blue,
 * jewellery/movies/food amber, gift cards/beauty pink. An editor's own colour
 * (Admin → Categories → Colour) always wins; anything outside every group
 * falls back to one picked from its name.
 */
export const CATEGORY_COLOR_GROUPS: { match: RegExp; color: string }[] = [
  { match: /access|cloth|shipping/i, color: "#1f9059" },
  { match: /electronic|travel|sport|medical/i, color: "#2f7dd8" },
  { match: /jewel|movie|food/i, color: "#e8a010" },
  { match: /gift|beauty/i, color: "#ec4899" },
];

/** Swatches offered in the admin colour picker. */
export const CATEGORY_PALETTE = [
  "#1f9059",
  "#14b8a6",
  "#2f7dd8",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#e8a010",
  "#64748b",
];

export function defaultCategoryColor(name: string): string {
  return CATEGORY_COLOR_GROUPS.find((group) => group.match.test(name))?.color ?? tileColour(name);
}

export function categoryColor(category: { name: string; color?: string | null }): string {
  return category.color || defaultCategoryColor(category.name);
}

/**
 * Re-points the whole `brand` colour ramp (and its glow shadows) at one colour,
 * for a subtree. Every `bg-brand-*` / `text-brand-*` / gradient / ring inside
 * it — filters, tabs, coupon rows, buttons — then wears that colour with no
 * per-component changes. Set it as an inline `style` on a wrapper.
 */
export function brandThemeVars(color: string): Record<string, string> {
  const mix = (amount: number, other: string) =>
    `color-mix(in srgb, ${color} ${amount}%, ${other})`;

  return {
    "--color-brand-50": mix(7, "#ffffff"),
    "--color-brand-100": mix(15, "#ffffff"),
    "--color-brand-200": mix(30, "#ffffff"),
    "--color-brand-300": mix(48, "#ffffff"),
    "--color-brand-400": mix(72, "#ffffff"),
    "--color-brand-500": mix(90, "#ffffff"),
    "--color-brand-600": color,
    "--color-brand-700": mix(80, "#000000"),
    "--color-brand-800": mix(64, "#000000"),
    "--color-brand-900": mix(48, "#000000"),
    "--color-brand-950": mix(30, "#000000"),
    "--shadow-glow": `0 10px 30px -10px color-mix(in srgb, ${color} 60%, transparent)`,
    "--shadow-glow-strong": `0 18px 46px -14px color-mix(in srgb, ${color} 75%, transparent)`,
  };
}
