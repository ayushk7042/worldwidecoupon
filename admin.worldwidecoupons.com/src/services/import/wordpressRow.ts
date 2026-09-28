import type { CouponType, DiscountType } from "../../models/Coupon.js";
import { blocksToText, brandFromDomain, cleanText, toDate } from "../../utils/text.js";
import { hostnameOf, normalizeUrl, originOf } from "../../utils/url.js";
import type { CsvRow } from "./csv.js";

/**
 * Maps one row of the WordPress "Coupons Export" CSV onto the shape this
 * backend stores.
 *
 * The export is messy in specific, repeatable ways, and every quirk handled
 * here was observed in the real file rather than guessed at:
 *
 *  - Names are double HTML-encoded: `h&amp;m`, `BJ&quot;s`.
 *  - `coupon_code` is a free-text field an editor sometimes filled with a URL
 *    or their own name, so it cannot be trusted as a code without checking.
 *  - Three separate URL columns hold the same link with different priorities.
 *  - Drafts carry the epoch as their date.
 *  - The discount lives in the title (`Up To 50% OFF`), never in a field.
 */

export interface NormalisedRow {
  legacyId: number;
  title: string;
  slug: string;
  description: string;

  type: CouponType;
  code?: string;

  discountType: DiscountType;
  discountValue?: number;

  storeName: string;
  storeLegacyId?: number;
  categoryNames: string[];
  categoryLegacyId?: number;

  destinationUrl?: string;
  landingUrl?: string;
  websiteUrl?: string;
  domain?: string;

  imageUrl?: string;
  imageAlt?: string;

  focusKeyword?: string;
  status: "active" | "draft";
  publishedAt: Date | null;
  modifiedAt: Date | null;

  issues: string[];
}

/**
 * A real coupon code: short, no whitespace, no scheme, not a sentence.
 *
 * The export contains `nakul` (an editor's name) and a full Amazon URL in this
 * column, both of which would be shown to a shopper as a code to type in.
 */
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._%+$-]{1,29}$/;

const NON_CODES = new Set([
  "nakul",
  "none",
  "na",
  "n/a",
  "no code",
  "nocode",
  "null",
  "-",
]);

export function extractCode(raw: string): { code?: string; issue?: string } {
  const value = cleanText(raw);
  if (!value) return {};

  if (/^https?:\/\//i.test(value) || value.includes("/")) {
    return { issue: `Ignored a URL in the code column: ${value.slice(0, 60)}` };
  }

  if (NON_CODES.has(value.toLowerCase())) {
    return { issue: `Ignored placeholder code: ${value}` };
  }

  if (!CODE_PATTERN.test(value)) {
    return { issue: `Ignored an implausible code: ${value.slice(0, 40)}` };
  }

  return { code: value.toUpperCase() };
}

/**
 * Reads the saving out of the title, which is the only place it exists.
 *
 * Order matters: "Up To $150 OFF On Apple Watch" must not be read as 150%,
 * so the currency form is tested before the bare-number form.
 */
export function extractDiscount(title: string): {
  discountType: DiscountType;
  discountValue?: number;
} {
  const text = cleanText(title);

  const percent = text.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  const money = text.match(/(?:[$£€₹])\s*([\d,]+(?:\.\d+)?)/);

  // "Up To 30% - 50% OFF" — quote the better number, as the page does.
  if (percent) {
    const all = [...text.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)]
      .map((match) => Number(match[1]))
      .filter((value) => value > 0 && value <= 100);

    if (all.length) {
      return { discountType: "percent", discountValue: Math.max(...all) };
    }
  }

  if (money) {
    const value = Number((money[1] ?? "").replace(/,/g, ""));
    // A "price starts at $18" title is not a $18 discount, so only treat a
    // currency amount as a saving when the copy actually says so.
    if (Number.isFinite(value) && value > 0 && /\b(off|save|discount|cashback)\b/i.test(text)) {
      return { discountType: "fixed", discountValue: value };
    }
  }

  if (/free\s+ship/i.test(text)) return { discountType: "shipping" };
  if (/\bbogo\b|buy\s*1\s*get\s*1|buy\s*one\s*get\s*one/i.test(text)) {
    return { discountType: "bogo" };
  }
  if (/free\s+(gift|sample|trial)/i.test(text)) return { discountType: "gift" };

  return { discountType: "other" };
}

/** The flavour of offer, which decides how the card behaves. */
export function inferType(title: string, hasCode: boolean): CouponType {
  const text = cleanText(title).toLowerCase();

  if (hasCode) return "code";
  if (/free\s+ship/.test(text)) return "freeshipping";
  if (/\bbogo\b|buy\s*1\s*get\s*1|buy\s*one\s*get\s*one/.test(text)) return "bogo";
  if (/cashback|cash\s*back/.test(text)) return "cashback";
  if (/gift\s*card/.test(text)) return "giftcard";

  return "deal";
}

const toInt = (value: string): number | undefined => {
  const parsed = Number.parseInt(cleanText(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function normaliseWordpressRow(row: CsvRow): NormalisedRow | null {
  const issues: string[] = [];

  const title = cleanText(row.Title ?? "");
  if (!title) return null;

  const legacyId = toInt(row.ID ?? "") ?? 0;

  /* ---- the link ----
     Three columns hold the same idea. `coupon_affiliate` is the monetised one
     and wins; `coupon_url` is usually a copy of it; `coupon_spec_link` is the
     deep link an editor pasted. */
  const affiliate = normalizeUrl(row.coupon_affiliate);
  const couponUrl = normalizeUrl(row.coupon_url);
  const specLink = normalizeUrl(row.coupon_spec_link);

  const destinationUrl = affiliate ?? couponUrl ?? specLink ?? undefined;
  const landingUrl =
    specLink && specLink !== destinationUrl ? specLink : undefined;

  const domain = hostnameOf(destinationUrl);
  const websiteUrl = originOf(destinationUrl) ?? undefined;

  /* ---- the code ---- */
  const { code, issue: codeIssue } = extractCode(row.coupon_code ?? "");
  if (codeIssue) issues.push(codeIssue);

  /* ---- store and categories ----
     A published row with no store still has a usable link, so the domain
     becomes the store rather than dropping the offer entirely. */
  let storeName = cleanText(row.Stores ?? "");
  if (!storeName && domain) {
    storeName = brandFromDomain(domain);
    issues.push(`Store was missing; derived "${storeName}" from ${domain}`);
  }

  if (!storeName) {
    issues.push("Skipped: no store and no link to derive one from");
    return {
      legacyId,
      title,
      slug: cleanText(row.Slug ?? ""),
      description: "",
      type: "deal",
      discountType: "other",
      storeName: "",
      categoryNames: [],
      status: "draft",
      publishedAt: null,
      modifiedAt: null,
      issues,
    };
  }

  const categoryNames = cleanText(row.Categories ?? "")
    .split("|")
    .map((name) => cleanText(name))
    .filter(Boolean);

  const { discountType, discountValue } = extractDiscount(title);

  return {
    legacyId,
    title,
    slug: cleanText(row.Slug ?? ""),
    description: blocksToText(row.Content ?? ""),

    type: inferType(title, Boolean(code)),
    code,

    discountType,
    discountValue,

    storeName,
    storeLegacyId: toInt(row["_yoast_wpseo_primary_coupon-store"] ?? ""),
    categoryNames,
    categoryLegacyId: toInt(row["_yoast_wpseo_primary_coupon-category"] ?? ""),

    destinationUrl,
    landingUrl,
    websiteUrl,
    domain: domain ?? undefined,

    imageUrl: normalizeUrl(row["Image URL"]) ?? undefined,
    imageAlt: cleanText(row["Image Alt Text"] ?? "") || undefined,

    focusKeyword: cleanText(row._yoast_wpseo_focuskw ?? "") || undefined,

    status: cleanText(row.Status ?? "").toLowerCase() === "publish" ? "active" : "draft",
    publishedAt: toDate(row.Date),
    modifiedAt: toDate(row["Post Modified Date"]),

    issues,
  };
}
