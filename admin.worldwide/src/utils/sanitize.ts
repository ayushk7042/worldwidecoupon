import sanitizeHtml from "sanitize-html";

/**
 * Long-form HTML: store "about" blocks, FAQ answers, coupon terms.
 * Rich enough for an editor, with nothing that can execute.
 */
const RICH_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    // Every outbound link in editor content is untrusted and monetised.
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: attribs.target || "_blank",
        rel: "nofollow sponsored noopener noreferrer",
      },
    }),
  },
  disallowedTagsMode: "discard",
};

/** Single-line copy: titles, taglines, badge labels. No markup survives. */
const PLAIN_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

export function sanitizeRich(input: unknown): string {
  return sanitizeHtml(String(input ?? ""), RICH_OPTIONS).trim();
}

export function sanitizePlain(input: unknown): string {
  return sanitizeHtml(String(input ?? ""), PLAIN_OPTIONS)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Multi-line plain text — coupon descriptions imported from WordPress keep
 * their line breaks, which is how the bullet list on a card is rendered.
 */
export function sanitizeMultiline(input: unknown): string {
  return sanitizeHtml(String(input ?? ""), PLAIN_OPTIONS)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, index, all) => line || all[index - 1])
    .join("\n")
    .trim();
}
