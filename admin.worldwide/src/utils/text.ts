import slugifyLib from "slugify";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  trade: "™",
  reg: "®",
  copy: "©",
  eacute: "é",
  pound: "£",
  euro: "€",
  cent: "¢",
  deg: "°",
  middot: "·",
  bull: "•",
  dagger: "†",
};

/**
 * The WordPress export double-encodes: store names arrive as `h&amp;m` and
 * `BJ&quot;s`. Decoding runs twice so `&amp;amp;` collapses fully.
 */
export function decodeEntities(input: string): string {
  let out = String(input ?? "");

  for (let pass = 0; pass < 2; pass += 1) {
    out = out
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16))
      )
      .replace(/&#(\d+);/g, (_m, dec: string) =>
        String.fromCodePoint(parseInt(dec, 10))
      )
      .replace(/&([a-zA-Z][a-zA-Z0-9]{1,10});/g, (match, name: string) => {
        const replacement = NAMED_ENTITIES[name.toLowerCase()];
        return replacement ?? match;
      });
  }

  return out;
}

/** Strips zero-width characters the WordPress editor loves to leave behind. */
export function stripInvisible(input: string): string {
  return String(input ?? "").replace(/[​-‍⁠﻿]/g, "");
}

export function cleanText(input: unknown): string {
  return stripInvisible(decodeEntities(String(input ?? "")))
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  const base = slugifyLib(cleanText(input), {
    lower: true,
    strict: true,
    trim: true,
    remove: /[*+~.()'"!:@]/g,
  });

  return base || "item";
}

/** Words that stay lowercase inside a title, e.g. "CDs Books and Magazine". */
const MINOR_WORDS = new Set([
  "and", "or", "the", "a", "an", "of", "for", "in", "on", "to", "at", "by",
  "with", "from", "vs",
]);

/**
 * Title-cases a name that arrived all-lowercase, e.g. `bestbuy` → `Bestbuy`.
 *
 * Already-capitalised words are left alone, so `DHGate`, `FIITG` and `h&m`
 * survive the round trip instead of being flattened to `Dhgate`.
 */
export function titleCase(input: string): string {
  const words = cleanText(input).split(" ");

  return words
    .map((word, index) => {
      if (word !== word.toLowerCase()) return word; // already styled
      if (index > 0 && MINOR_WORDS.has(word)) return word;
      if (word.length < 2) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Two-part public suffixes we actually see in this data. A full Public Suffix
 * List would be a dependency and a monthly update for a handful of domains.
 */
const MULTI_PART_TLDS = new Set([
  "co.uk", "co.in", "co.nz", "co.za", "co.jp", "co.kr",
  "com.au", "com.br", "com.mx", "com.sg", "com.tr", "com.cn",
  "org.uk", "net.au", "ac.uk", "gov.uk",
]);

/**
 * The brand label inside a hostname.
 *
 * Naively taking the first label turns `india.resellerclub.com` into "India"
 * and `ww25.yolovahair.com` into "Ww25", so the registrable label — the one
 * immediately before the public suffix — is the one that means anything.
 */
export function brandFromDomain(domain: string): string {
  const host = cleanText(domain).toLowerCase().replace(/^www\d*\./, "");
  const parts = host.split(".").filter(Boolean);

  if (parts.length <= 1) return titleCase(parts[0] ?? host);

  const lastTwo = parts.slice(-2).join(".");
  const suffixLength = MULTI_PART_TLDS.has(lastTwo) ? 3 : 2;

  const label = parts[Math.max(0, parts.length - suffixLength)] ?? parts[0] ?? host;

  return titleCase(label);
}

export function truncate(input: string, max: number, suffix = "…"): string {
  const text = cleanText(input);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - suffix.length)).trimEnd()}${suffix}`;
}

/** Turns WordPress block markup into readable lines. */
export function blocksToText(html: string): string {
  return stripInvisible(
    decodeEntities(
      String(html ?? "")
        .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "")
        .replace(/<\/(p|li|ul|ol|div|h[1-6])>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
    )
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export const toBool = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

export const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return null;
  // WordPress uses the epoch as "no date".
  if (date.getUTCFullYear() <= 1970) return null;
  return date;
};
