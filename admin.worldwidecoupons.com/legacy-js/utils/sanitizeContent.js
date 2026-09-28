const sanitizeHtml = require("sanitize-html");

/**
 * Formatting-preserving HTML sanitiser.
 *
 * Goal: content pasted from Word, Google Docs, Wikipedia, Medium, news sites or
 * raw HTML must survive intact — fonts, headings, bold/italic/underline,
 * tables, lists, colours, links, alignment, spacing, images and captions — while
 * every executable vector is removed.
 *
 * What is removed: <script>, <style>, <iframe> from unknown hosts, event
 * handlers (onclick etc.), javascript:/vbscript: URLs, <form> inputs, and
 * anything that can run code or exfiltrate.
 */

/* =========================================================
   ALLOWED TAGS
========================================================= */

const ALLOWED_TAGS = [
  // structure
  "div", "section", "article", "aside", "main", "header", "footer", "nav",
  "p", "span", "br", "hr", "pre", "code", "blockquote", "q", "cite",
  // headings
  "h1", "h2", "h3", "h4", "h5", "h6",
  // inline formatting
  "b", "strong", "i", "em", "u", "s", "strike", "del", "ins", "mark",
  "small", "sub", "sup", "big", "abbr", "acronym", "kbd", "samp", "var", "time",
  // lists
  "ul", "ol", "li", "dl", "dt", "dd",
  // tables
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
  "col", "colgroup",
  // media
  "img", "figure", "figcaption", "picture", "source",
  "video", "audio", "track", "iframe",
  // links
  "a",
  // misc formatting that Word/Docs emit
  "font", "center", "address", "details", "summary", "wbr", "ruby", "rt", "rp",
];

/* =========================================================
   ALLOWED ATTRIBUTES
========================================================= */

const GLOBAL_ATTRS = [
  "style", "class", "id", "title", "lang", "dir", "align", "valign",
  "data-*", "role", "aria-label", "aria-hidden",
];

const ALLOWED_ATTRIBUTES = {
  "*": GLOBAL_ATTRS,

  a: [
    ...GLOBAL_ATTRS,
    "href", "name", "target", "rel", "download", "hreflang", "type",
  ],

  img: [
    ...GLOBAL_ATTRS,
    "src", "srcset", "sizes", "alt", "width", "height",
    "loading", "decoding", "fetchpriority", "usemap",
    // custom behaviour carried through to the renderer
    "data-redirect", "data-new-tab", "data-caption", "data-credit",
    "data-image-title", "data-priority", "data-media-id",
  ],

  source: [...GLOBAL_ATTRS, "src", "srcset", "sizes", "type", "media"],

  video: [
    ...GLOBAL_ATTRS,
    "src", "poster", "controls", "autoplay", "muted", "loop",
    "playsinline", "preload", "width", "height",
  ],

  audio: [...GLOBAL_ATTRS, "src", "controls", "autoplay", "muted", "loop", "preload"],

  iframe: [
    ...GLOBAL_ATTRS,
    "src", "width", "height", "frameborder", "allow", "allowfullscreen",
    "loading", "referrerpolicy",
  ],

  table: [
    ...GLOBAL_ATTRS,
    "border", "cellpadding", "cellspacing", "width", "height",
    "bgcolor", "summary", "rules", "frame",
  ],

  td: [...GLOBAL_ATTRS, "colspan", "rowspan", "width", "height", "bgcolor", "nowrap", "scope", "headers"],
  th: [...GLOBAL_ATTRS, "colspan", "rowspan", "width", "height", "bgcolor", "nowrap", "scope", "abbr", "headers"],
  tr: [...GLOBAL_ATTRS, "bgcolor", "height"],
  col: [...GLOBAL_ATTRS, "span", "width"],
  colgroup: [...GLOBAL_ATTRS, "span", "width"],

  ol: [...GLOBAL_ATTRS, "start", "type", "reversed"],
  ul: [...GLOBAL_ATTRS, "type"],
  li: [...GLOBAL_ATTRS, "value"],

  font: [...GLOBAL_ATTRS, "color", "face", "size"],

  blockquote: [...GLOBAL_ATTRS, "cite"],
  q: [...GLOBAL_ATTRS, "cite"],
  time: [...GLOBAL_ATTRS, "datetime"],
  details: [...GLOBAL_ATTRS, "open"],
};

/* =========================================================
   ALLOWED CSS
   Word / Docs lean heavily on inline styles — keeping them is the whole point.
========================================================= */

const CSS_SAFE_VALUE = [
  // colours, keywords, numbers with units, font stacks, css functions
  /^[a-zA-Z0-9\s.,'"%#()/_+-]*$/,
];

const STYLE_PROPS = [
  // typography
  "color", "background", "background-color", "background-image", "background-position",
  "background-repeat", "background-size",
  "font", "font-family", "font-size", "font-weight", "font-style", "font-variant",
  "font-stretch", "line-height", "letter-spacing", "word-spacing",
  "text-align", "text-align-last", "text-decoration", "text-decoration-line",
  "text-decoration-color", "text-decoration-style", "text-indent", "text-transform",
  "text-shadow", "text-overflow", "white-space", "word-break", "word-wrap",
  "overflow-wrap", "hyphens", "vertical-align", "direction", "unicode-bidi",
  "writing-mode", "quotes",
  // box model
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-color", "border-style", "border-width", "border-radius",
  "border-collapse", "border-spacing",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "box-sizing", "outline", "outline-color", "outline-style", "outline-width",
  // layout (safe subset — no position:fixed escapes because we drop `position`)
  "display", "float", "clear", "overflow", "overflow-x", "overflow-y",
  "flex", "flex-direction", "flex-wrap", "justify-content", "align-items",
  "align-self", "align-content", "gap", "row-gap", "column-gap", "order",
  "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
  "columns", "column-count", "column-gap", "column-rule",
  // visual
  "opacity", "box-shadow", "filter", "object-fit", "object-position",
  "list-style", "list-style-type", "list-style-position", "list-style-image",
  "caption-side", "table-layout", "empty-cells", "aspect-ratio",
];

const allowedStyles = {
  "*": STYLE_PROPS.reduce((acc, prop) => {
    acc[prop] = CSS_SAFE_VALUE;
    return acc;
  }, {}),
};

/* =========================================================
   IFRAME ALLOWLIST (video embeds only)
========================================================= */

const IFRAME_HOSTS = [
  "youtube.com", "www.youtube.com", "youtube-nocookie.com",
  "www.youtube-nocookie.com", "youtu.be",
  "player.vimeo.com", "vimeo.com",
  "www.dailymotion.com", "dailymotion.com",
  "open.spotify.com",
  "www.google.com", // maps embeds
  "maps.google.com",
  "w.soundcloud.com",
];

const isAllowedIframe = (src = "") => {
  try {
    const { hostname, protocol } = new URL(src, "https://placeholder.local");
    if (protocol !== "https:" && protocol !== "http:") return false;
    return IFRAME_HOSTS.includes(hostname);
  } catch {
    return false;
  }
};

/* =========================================================
   TRANSFORMS
========================================================= */

const transformTags = {
  // Outbound links open safely.
  a: (tagName, attribs) => {
    const next = { ...attribs };

    if (next.target === "_blank") {
      const rel = new Set((next.rel || "").split(/\s+/).filter(Boolean));
      rel.add("noopener");
      rel.add("noreferrer");
      next.rel = [...rel].join(" ");
    }

    return { tagName: "a", attribs: next };
  },

  // Sensible defaults for every inline image.
  img: (tagName, attribs) => {
    const next = { ...attribs };

    if (!next.loading && next["data-priority"] !== "true") {
      next.loading = "lazy";
    }
    if (!next.decoding) next.decoding = "async";
    if (!next.alt) next.alt = next["data-caption"] || "";

    return { tagName: "img", attribs: next };
  },
};

/* =========================================================
   OPTIONS
========================================================= */

const baseOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedStyles,
  allowedSchemes: ["http", "https", "mailto", "tel", "ftp"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"], // data: needed for pasted inline images
  },
  allowedSchemesAppliedToAttributes: ["href", "src", "cite", "data-redirect"],
  allowProtocolRelative: true,
  // keep <b>/<i>/<font> exactly as pasted instead of normalising them away
  transformTags,
  // Word pastes contain conditional comments; drop them, keep the content
  allowedIframeHostnames: IFRAME_HOSTS,
  exclusiveFilter: (frame) => {
    if (frame.tag === "iframe") return !isAllowedIframe(frame.attribs.src || "");
    return false;
  },
  // whitespace matters for pasted layout
  parser: {
    lowerCaseAttributeNames: false,
  },
};

/* =========================================================
   PRE-CLEAN
   Strip the noise Word/Docs wrap around real content before sanitising.
========================================================= */

const preClean = (html) =>
  String(html)
    // MS Word conditional comments  <!--[if gte mso 9]> ... <![endif]-->
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    // <o:p></o:p> and other office namespaces
    .replace(/<\/?[a-z]+:[^>]*>/gi, "")
    // <xml> blocks
    .replace(/<xml[\s\S]*?<\/xml>/gi, "")
    // <style> and <script> blocks entirely (content included)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // inline event handlers, before the parser ever sees them
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    // javascript: / vbscript: urls
    .replace(/(href|src|data-redirect)\s*=\s*(["'])\s*(javascript|vbscript|data:text\/html)[^"']*\2/gi, '$1="#"');

/* =========================================================
   PUBLIC API
========================================================= */

/**
 * Sanitise article HTML while preserving pasted formatting.
 * @param {string} html
 * @returns {string}
 */
const sanitizeContent = (html) => {
  if (!html || typeof html !== "string") return "";
  return sanitizeHtml(preClean(html), baseOptions);
};

/**
 * Stricter variant for short fields (titles, captions, descriptions):
 * inline formatting only, no block elements or media.
 */
const sanitizeInline = (html) => {
  if (!html || typeof html !== "string") return "";
  return sanitizeHtml(preClean(html), {
    ...baseOptions,
    allowedTags: ["b", "strong", "i", "em", "u", "s", "mark", "sub", "sup", "span", "a", "br"],
    allowedAttributes: {
      "*": ["style", "class"],
      a: ["href", "target", "rel", "title"],
    },
  });
};

/** Strip all markup — used for excerpts, search text and read time. */
const toPlainText = (html) => {
  if (!html || typeof html !== "string") return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

module.exports = {
  sanitizeContent,
  sanitizeInline,
  toPlainText,
  ALLOWED_TAGS,
  IFRAME_HOSTS,
};
