const Category = require("../models/Category");
const { COLUMN_BY_KEY, GALLERY_SEPARATOR } = require("./importSchema.service");
const { parseDate, parseList, zipGallery, makeSlug } = require("../utils/newsHelpers");

/**
 * Turns one sheet row into the body shape `buildNewsPayload` understands.
 * Blank cells are omitted entirely so an upsert never wipes existing values.
 */
const rowToBody = (row) => {
  const body = {};
  const has = (k) => row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "";

  /* ---------- straight passthrough ---------- */
  const passthrough = [
    "title", "slug", "category", "subCategory",
    "shortDescription", "longDescription", "content", "excerpt",
    "authorName", "authorImage", "authorBio", "authorDesignation", "authorRedirectUrl",
    "tags", "priority", "featured", "trending", "popular", "breakingNews", "editorsPick",
    "status", "publishedDate", "scheduledAt", "readTime",
    "language", "country", "region", "destination",
    "sourceName", "sourceUrl", "canonicalUrl",
    "metaTitle", "metaDescription", "focusKeyword", "robots", "schema",
    "externalLink",
  ];

  passthrough.forEach((k) => {
    if (has(k)) body[k] = row[k];
  });

  // the News schema requires `description`
  if (has("shortDescription")) body.description = row.shortDescription;

  /* ---------- featured image ---------- */
  if (has("featuredImageUrl")) {
    body.featuredImage = {
      url: row.featuredImageUrl,
      redirectUrl: row.featuredImageRedirect || "",
      alt: row.featuredImageAlt || "",
      caption: row.featuredImageCaption || "",
      credit: row.featuredImageCredit || "",
      priority: true, // above the fold on the article page
    };
  }

  if (has("ogImage")) body.ogImage = { url: row.ogImage };
  if (has("twitterImage")) body.twitterImage = { url: row.twitterImage };

  /* ---------- gallery ---------- */
  if (has("galleryImages")) {
    body.gallery = zipGallery(
      {
        urls: row.galleryImages,
        redirects: row.galleryRedirects,
        captions: row.galleryCaptions,
        alts: row.galleryAlts,
        credits: row.galleryCredits,
      },
      GALLERY_SEPARATOR
    );
  }

  /* ---------- video ---------- */
  if (has("videoUrl")) {
    body.videos = [
      {
        url: row.videoUrl,
        thumbnail: has("videoThumbnail") ? { url: row.videoThumbnail } : undefined,
        redirectUrl: row.videoRedirect || "",
      },
    ];
  }

  /* ---------- cta / ads ---------- */
  if (has("ctaLabel") || has("ctaUrl")) {
    body.cta = { label: row.ctaLabel || "", url: row.ctaUrl || "" };
  }

  if (has("adCode") || has("adPosition")) {
    body.advertisement = {
      code: row.adCode || "",
      position: row.adPosition || "",
      enabled: true,
    };
  }

  return body;
};

/* =========================================================
   VALIDATION
========================================================= */

const URL_RE = /^(https?:)?\/\/[^\s]+$/i;
const VALID_STATUS = ["draft", "published", "archived", "scheduled", "trash"];

/**
 * Validate a batch of rows.
 * Category lookups are cached so a 5000-row sheet costs one query per distinct
 * category rather than one per row.
 *
 * @returns {Promise<{rows: object[], errors: object[], summary: object}>}
 */
const validateRows = async (rows) => {
  const errors = [];
  const categoryCache = new Map();
  const slugsInSheet = new Map();

  const lookupCategory = async (value) => {
    const key = String(value).trim().toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key);

    const found = await Category.findOne({
      $or: [
        { slug: makeSlug(value) },
        { name: new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        ...(/^[0-9a-fA-F]{24}$/.test(value) ? [{ _id: value }] : []),
      ],
    })
      .select("_id name")
      .lean();

    categoryCache.set(key, found);
    return found;
  };

  const addError = (row, field, message, value) =>
    errors.push({ row: row.__row, field, message, value: String(value ?? "").slice(0, 120) });

  for (const row of rows) {
    /* required */
    if (!row.title || !String(row.title).trim()) {
      addError(row, "Title", "Title is required", row.title);
    }

    if (!row.category) {
      addError(row, "Category", "Category is required", "");
    } else {
      const cat = await lookupCategory(row.category);
      if (!cat) {
        addError(row, "Category", "Category does not exist — create it first", row.category);
      } else {
        row.__categoryId = cat._id;
      }
    }

    if (row.subCategory) {
      const sub = await lookupCategory(row.subCategory);
      if (!sub) addError(row, "Sub Category", "Sub category does not exist", row.subCategory);
    }

    if (!row.shortDescription || !String(row.shortDescription).trim()) {
      addError(row, "Short Description", "Short Description is required", "");
    }

    /* slug duplicates inside the sheet */
    const slug = makeSlug(row.slug || row.title || "");
    if (slug) {
      if (slugsInSheet.has(slug)) {
        addError(
          row,
          "Slug",
          `Duplicate slug in the sheet (also on row ${slugsInSheet.get(slug)})`,
          slug
        );
      } else {
        slugsInSheet.set(slug, row.__row);
      }
      row.__slug = slug;
    }

    /* types */
    Object.keys(row).forEach((key) => {
      if (key.startsWith("__")) return;
      const col = COLUMN_BY_KEY.get(key);
      if (!col) return;

      const value = row[key];

      if (col.type === "url" && value && !URL_RE.test(String(value).trim())) {
        addError(row, col.header, "Not a valid URL (must start with http:// or https://)", value);
      }

      if (col.type === "number" && value !== "" && !Number.isFinite(Number(value))) {
        addError(row, col.header, "Must be a number", value);
      }

      if (col.type === "date" && value && !parseDate(value)) {
        addError(row, col.header, "Unrecognised date — use YYYY-MM-DD", value);
      }

      if (col.type === "json" && value) {
        try {
          JSON.parse(value);
        } catch {
          addError(row, col.header, "Invalid JSON", value);
        }
      }
    });

    if (row.status && !VALID_STATUS.includes(String(row.status).trim().toLowerCase())) {
      addError(row, "Status", `Must be one of: ${VALID_STATUS.join(", ")}`, row.status);
    }

    /* gallery column length mismatch is a warning-level error */
    if (row.galleryImages) {
      const imgCount = parseList(row.galleryImages, GALLERY_SEPARATOR).length;
      [
        ["galleryRedirects", "Gallery Redirect Links"],
        ["galleryCaptions", "Gallery Captions"],
        ["galleryAlts", "Gallery Alt"],
      ].forEach(([key, header]) => {
        if (!row[key]) return;
        const count = parseList(row[key], GALLERY_SEPARATOR).length;
        if (count > imgCount) {
          addError(
            row,
            header,
            `${count} values for ${imgCount} image(s) — extras are ignored`,
            row[key]
          );
        }
      });
    }
  }

  const rowsWithErrors = new Set(errors.map((e) => e.row));

  return {
    rows,
    errors,
    summary: {
      totalRows: rows.length,
      validRows: rows.length - rowsWithErrors.size,
      errorRows: rowsWithErrors.size,
      errorCount: errors.length,
    },
  };
};

module.exports = { rowToBody, validateRows, VALID_STATUS };
