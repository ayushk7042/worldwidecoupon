const slugifyLib = require("slugify");
const { toPlainText } = require("./sanitizeContent");

/* =========================================================
   SLUGS
========================================================= */

const makeSlug = (text = "") =>
  slugifyLib(String(text), { lower: true, strict: true, trim: true });

/**
 * Produce a slug that is unique in the collection.
 * @param {import("mongoose").Model} Model
 * @param {string} text
 * @param {string|null} ignoreId  document allowed to keep the slug (on update)
 */
const uniqueSlug = async (Model, text, ignoreId = null) => {
  const base = makeSlug(text) || `item-${Date.now()}`;
  let slug = base;
  let n = 1;

  // bounded loop — falls back to a timestamp suffix if something is pathological
  while (n < 200) {
    const query = { slug };
    if (ignoreId) query._id = { $ne: ignoreId };

    const clash = await Model.findOne(query).select("_id").lean();
    if (!clash) return slug;

    n += 1;
    slug = `${base}-${n}`;
  }

  return `${base}-${Date.now()}`;
};

/* =========================================================
   IMAGES
========================================================= */

const TRUTHY = new Set(["true", "1", "yes", "y", "on", true, 1]);

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return TRUTHY.has(String(value).trim().toLowerCase());
};

/**
 * Accepts anything an admin, an importer or a legacy document might supply and
 * returns the canonical image object.
 *
 *   "https://x/y.jpg"                        -> { url }
 *   { url, alt, redirectUrl, ... }           -> passed through, normalised
 *   { public_id, url }  (legacy featured)    -> preserved
 */
const normalizeImage = (input) => {
  if (!input) return undefined;

  if (typeof input === "string") {
    const url = input.trim();
    if (!url) return undefined;
    return { url, openInNewTab: true, lazyLoad: true, responsive: true };
  }

  if (typeof input !== "object") return undefined;

  const url = (input.url || input.secureUrl || input.src || "").trim();
  if (!url && !input.public_id) return undefined;

  return {
    public_id: input.public_id || "",
    url,
    thumbnailUrl: input.thumbnailUrl || "",
    width: Number(input.width) || undefined,
    height: Number(input.height) || undefined,
    format: input.format || undefined,
    bytes: Number(input.bytes) || undefined,

    alt: input.alt || "",
    caption: input.caption || "",
    title: input.title || "",
    credit: input.credit || "",

    redirectUrl: (input.redirectUrl || input.redirect || "").trim(),
    openInNewTab: toBool(input.openInNewTab, true),
    nofollow: toBool(input.nofollow, true),
    lazyLoad: toBool(input.lazyLoad, true),
    priority: toBool(input.priority, false),
    responsive: toBool(input.responsive, true),
  };
};

const normalizeGallery = (input) => {
  if (!input) return [];
  const list = Array.isArray(input) ? input : [input];
  return list.map(normalizeImage).filter(Boolean);
};

/* =========================================================
   READ TIME / EXCERPT
========================================================= */

const WORDS_PER_MINUTE = 200;

const calcReadTime = (html = "", blocks = []) => {
  const fromBlocks = (blocks || [])
    .map((b) => (typeof b?.value === "string" ? b.value : ""))
    .join(" ");

  const words = toPlainText(`${html} ${fromBlocks}`)
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const makeExcerpt = (html = "", max = 200) => {
  const text = toPlainText(html);
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
};

/* =========================================================
   MISC PARSERS (shared with the Excel importer)
========================================================= */

/** "a, b , c" | ["a","b"] -> ["a","b","c"] */
const parseList = (value, separator = ",") => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return String(value)
    .split(separator)
    .map((v) => v.trim())
    .filter(Boolean);
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Zip parallel columns from the import sheet into gallery objects:
 *   urls: "a.jpg|b.jpg", captions: "one|two", alts: "A|B", redirects: "u1|u2"
 */
const zipGallery = ({ urls, captions, alts, redirects, credits }, separator = "|") => {
  const u = parseList(urls, separator);
  const c = parseList(captions, separator);
  const a = parseList(alts, separator);
  const r = parseList(redirects, separator);
  const cr = parseList(credits, separator);

  return u.map((url, i) =>
    normalizeImage({
      url,
      caption: c[i] || "",
      alt: a[i] || c[i] || "",
      redirectUrl: r[i] || "",
      credit: cr[i] || "",
    })
  ).filter(Boolean);
};

module.exports = {
  makeSlug,
  uniqueSlug,
  normalizeImage,
  normalizeGallery,
  calcReadTime,
  makeExcerpt,
  parseList,
  parseDate,
  parseNumber,
  zipGallery,
  toBool,
};
