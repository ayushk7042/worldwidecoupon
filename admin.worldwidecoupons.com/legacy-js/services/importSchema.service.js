/**
 * Single source of truth for the bulk Excel/CSV importer.
 *
 * The same definition drives:
 *   - the downloadable sample sheet (headers, help row, example row)
 *   - header matching when a sheet is uploaded
 *   - validation
 *   - row -> article payload mapping
 *
 * Add a column here and every part of the pipeline picks it up.
 */

const GALLERY_SEPARATOR = "|";

/**
 * key      internal payload key handed to buildNewsPayload
 * header   the human column title written into the sample sheet
 * aliases  other spellings accepted on upload (case/space insensitive)
 * required hard requirement — a missing value fails the row
 * type     text | longtext | html | number | boolean | date | list | url | json
 * help     shown in the sample sheet's guidance row
 * example  shown in the sample sheet's example row
 */
const COLUMNS = [
  /* ---------------- core ---------------- */
  {
    key: "title",
    header: "Title",
    required: true,
    type: "text",
    help: "Article headline. Required.",
    example: "Japan Reopens Its Most Remote Island Trail After 40 Years",
  },
  {
    key: "slug",
    header: "Slug",
    type: "text",
    help: "URL slug. Leave blank to auto-generate from the title. Used to match existing articles when updating.",
    example: "japan-reopens-remote-island-trail",
  },
  {
    key: "category",
    header: "Category",
    required: true,
    type: "text",
    help: "Category name, slug or id. Must already exist.",
    example: "Destinations",
  },
  {
    key: "subCategory",
    header: "Sub Category",
    type: "text",
    help: "Sub-category name, slug or id. Optional.",
    example: "Asia",
  },

  /* ---------------- copy ---------------- */
  {
    key: "shortDescription",
    header: "Short Description",
    required: true,
    type: "longtext",
    help: "1-2 line summary shown on cards and in meta tags.",
    example: "The 40 km coastal route on Yakushima opens to hikers this spring.",
  },
  {
    key: "longDescription",
    header: "Long Description",
    type: "longtext",
    help: "Optional standfirst / intro paragraph.",
    example: "Closed since 1985 after a landslide, the trail has been rebuilt…",
  },
  {
    key: "content",
    header: "Content",
    type: "html",
    help: "Full article body. Accepts plain text or HTML — headings, bold, tables, lists, colours and <img> tags are all preserved.",
    example: "<h2>A trail reborn</h2><p>The route climbs through <strong>ancient cedar forest</strong>…</p>",
  },
  {
    key: "excerpt",
    header: "Excerpt",
    type: "longtext",
    help: "Optional teaser. Auto-generated from the content when blank.",
    example: "Forty years after a landslide closed it, Yakushima's coastal trail returns.",
  },

  /* ---------------- author ---------------- */
  { key: "authorName", header: "Author", type: "text", help: "Author display name.", example: "Meera Raghavan" },
  { key: "authorImage", header: "Author Image", type: "url", help: "Author photo URL.", example: "https://cdn.example.com/authors/meera.jpg" },
  { key: "authorBio", header: "Author Bio", type: "longtext", help: "Short author biography.", example: "Travel editor covering the Asia-Pacific." },
  { key: "authorDesignation", header: "Author Designation", type: "text", help: "Job title shown under the byline.", example: "Senior Travel Editor" },
  { key: "authorRedirectUrl", header: "Author Redirect URL", type: "url", help: "Where clicking the author name goes.", example: "https://thesavingdeck.com/authors/meera" },

  /* ---------------- featured image ---------------- */
  { key: "featuredImageUrl", header: "Featured Image", type: "url", help: "Main image URL.", example: "https://cdn.example.com/yakushima.jpg" },
  { key: "featuredImageRedirect", header: "Featured Image Redirect URL", type: "url", help: "Clicking the featured image opens this URL.", example: "https://partner.example.com/yakushima-tours" },
  { key: "featuredImageAlt", header: "Featured Image Alt", type: "text", help: "Alt text for accessibility and SEO.", example: "Cedar forest trail on Yakushima island" },
  { key: "featuredImageCaption", header: "Featured Image Caption", type: "text", help: "Caption printed under the image.", example: "The rebuilt boardwalk through Shiratani Unsuikyo." },
  { key: "featuredImageCredit", header: "Featured Image Credit", type: "text", help: "Photographer / source credit.", example: "Photo: Kenji Sato" },

  /* ---------------- gallery ---------------- */
  {
    key: "galleryImages",
    header: "Gallery Images",
    type: "list",
    help: `Multiple image URLs separated by "${GALLERY_SEPARATOR}". Any number of images is supported.`,
    example: "https://cdn.example.com/g1.jpg|https://cdn.example.com/g2.jpg",
  },
  { key: "galleryRedirects", header: "Gallery Redirect Links", type: "list", help: `Redirect URL per gallery image, same order, separated by "${GALLERY_SEPARATOR}".`, example: "https://a.example.com|https://b.example.com" },
  { key: "galleryCaptions", header: "Gallery Captions", type: "list", help: `Caption per gallery image, same order.`, example: "Sunrise at the summit|Cedar boardwalk" },
  { key: "galleryAlts", header: "Gallery Alt", type: "list", help: `Alt text per gallery image, same order.`, example: "Sunrise over Yakushima|Wooden boardwalk" },
  { key: "galleryCredits", header: "Gallery Credits", type: "list", help: `Credit per gallery image, same order.`, example: "Kenji Sato|Kenji Sato" },

  /* ---------------- video ---------------- */
  { key: "videoUrl", header: "Video URL", type: "url", help: "YouTube, Vimeo or MP4 URL.", example: "https://www.youtube.com/watch?v=abc123" },
  { key: "videoThumbnail", header: "Video Thumbnail", type: "url", help: "Poster image for the video.", example: "https://cdn.example.com/video-poster.jpg" },
  { key: "videoRedirect", header: "Video Redirect", type: "url", help: "Where clicking the video card goes.", example: "https://thesavingdeck.com/watch/yakushima" },

  /* ---------------- taxonomy / flags ---------------- */
  { key: "tags", header: "Tags", type: "list", help: "Comma-separated. Tags that do not exist are created automatically.", example: "Japan, Hiking, Island Travel" },
  { key: "priority", header: "Priority", type: "number", help: "Higher numbers surface first in curated rails. Default 0.", example: "10" },
  { key: "featured", header: "Featured", type: "boolean", help: "TRUE / FALSE.", example: "TRUE" },
  { key: "trending", header: "Trending", type: "boolean", help: "TRUE / FALSE.", example: "FALSE" },
  { key: "popular", header: "Popular", type: "boolean", help: "TRUE / FALSE.", example: "FALSE" },
  { key: "breakingNews", header: "Breaking", type: "boolean", help: "TRUE / FALSE.", example: "FALSE" },
  { key: "editorsPick", header: "Editor's Pick", type: "boolean", help: "TRUE / FALSE.", example: "TRUE" },
  { key: "status", header: "Status", type: "text", help: "published | draft | scheduled | archived. Default published.", example: "published" },
  { key: "publishedDate", header: "Published Date", type: "date", help: "YYYY-MM-DD or YYYY-MM-DD HH:mm. Defaults to now.", example: "2026-04-12" },
  { key: "scheduledAt", header: "Scheduled At", type: "date", help: "Future date/time. Setting this switches the status to scheduled.", example: "" },
  { key: "readTime", header: "Read Time", type: "number", help: "Minutes. Calculated automatically when blank.", example: "" },

  /* ---------------- localisation ---------------- */
  { key: "language", header: "Language", type: "text", help: "ISO code. Default en.", example: "en" },
  { key: "country", header: "Country", type: "text", help: "Country the story is about.", example: "Japan" },
  { key: "region", header: "Region", type: "text", help: "Powers region browsing. e.g. Asia, Europe, Africa.", example: "Asia" },
  { key: "destination", header: "Destination", type: "text", help: "Specific place name.", example: "Yakushima" },

  /* ---------------- source ---------------- */
  { key: "sourceName", header: "Source", type: "text", help: "Original publication name.", example: "Japan Travel Bureau" },
  { key: "sourceUrl", header: "Source URL", type: "url", help: "Link to the original story.", example: "https://example.com/original" },
  { key: "canonicalUrl", header: "Canonical URL", type: "url", help: "Canonical tag target when this is a syndicated piece.", example: "" },

  /* ---------------- SEO ---------------- */
  { key: "metaTitle", header: "Meta Title", type: "text", help: "SEO title. Falls back to the article title.", example: "Yakushima Trail Reopens After 40 Years | TheSavingDeck" },
  { key: "metaDescription", header: "Meta Description", type: "longtext", help: "SEO description, ~155 characters.", example: "Japan's Yakushima coastal trail reopens this spring after four decades." },
  { key: "focusKeyword", header: "Focus Keyword", type: "text", help: "Primary keyword to optimise for.", example: "yakushima trail" },
  { key: "robots", header: "Robots", type: "text", help: "Robots meta directive. Default \"index, follow\".", example: "index, follow" },
  { key: "ogImage", header: "OG Image", type: "url", help: "Open Graph share image. Falls back to the featured image.", example: "" },
  { key: "twitterImage", header: "Twitter Image", type: "url", help: "Twitter card image. Falls back to the OG image.", example: "" },
  { key: "schema", header: "Schema JSON", type: "json", help: "Optional schema.org JSON-LD object.", example: "" },

  /* ---------------- conversion ---------------- */
  { key: "externalLink", header: "External Link", type: "url", help: "Generic outbound link attached to the article.", example: "" },
  { key: "ctaLabel", header: "CTA Button", type: "text", help: "Call-to-action button label.", example: "Book this trip" },
  { key: "ctaUrl", header: "CTA URL", type: "url", help: "Call-to-action destination.", example: "https://partner.example.com/book" },
  { key: "adCode", header: "Advertisement Code", type: "longtext", help: "Ad HTML or script for this article only.", example: "" },
  { key: "adPosition", header: "Advertisement Position", type: "text", help: "article-top | article-inline | article-bottom | sidebar.", example: "article-inline" },
];

/* =========================================================
   HEADER MATCHING
========================================================= */

const normalizeHeader = (h) =>
  String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** header text (any spelling) -> column key */
const HEADER_LOOKUP = (() => {
  const map = new Map();

  COLUMNS.forEach((col) => {
    map.set(normalizeHeader(col.header), col.key);
    map.set(normalizeHeader(col.key), col.key);
    (col.aliases || []).forEach((a) => map.set(normalizeHeader(a), col.key));
  });

  // a few extra spellings people actually use
  const extras = {
    description: "shortDescription",
    summary: "shortDescription",
    body: "content",
    articlecontent: "content",
    image: "featuredImageUrl",
    thumbnail: "featuredImageUrl",
    featuredimageurl: "featuredImageUrl",
    imageredirect: "featuredImageRedirect",
    imagealt: "featuredImageAlt",
    imagecaption: "featuredImageCaption",
    keywords: "tags",
    author: "authorName",
    breakingnews: "breakingNews",
    editorspick: "editorsPick",
    editorpick: "editorsPick",
    date: "publishedDate",
    publishdate: "publishedDate",
  };

  Object.entries(extras).forEach(([k, v]) => {
    if (!map.has(k)) map.set(k, v);
  });

  return map;
})();

const matchHeader = (header) => HEADER_LOOKUP.get(normalizeHeader(header)) || null;

const COLUMN_BY_KEY = new Map(COLUMNS.map((c) => [c.key, c]));

module.exports = {
  COLUMNS,
  COLUMN_BY_KEY,
  GALLERY_SEPARATOR,
  matchHeader,
  normalizeHeader,
};
