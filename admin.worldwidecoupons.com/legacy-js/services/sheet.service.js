const ExcelJS = require("exceljs");
const { Readable } = require("stream");

const {
  COLUMNS,
  matchHeader,
  GALLERY_SEPARATOR,
} = require("./importSchema.service");

/* =========================================================
   SAMPLE WORKBOOK
========================================================= */

const BRAND = {
  header: "FF0B3B36", // deep teal
  headerText: "FFFFFFFF",
  requiredHeader: "FF1F6F5C",
  help: "FFF1F5F4",
  example: "FFFAFAF8",
};

/**
 * Build the downloadable sample workbook.
 * Sheet 1 "Articles"  — headers + a guidance row + a filled example row
 * Sheet 2 "Instructions" — every column explained
 * @returns {Promise<Buffer>}
 */
const buildSampleWorkbook = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TheSavingDeck CMS";
  wb.created = new Date();

  /* ---------------- Articles ---------------- */

  const ws = wb.addWorksheet("Articles", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  ws.columns = COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.min(48, Math.max(18, col.header.length + 8)),
  }));

  // header styling
  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell, colNumber) => {
    const col = COLUMNS[colNumber - 1];
    cell.font = { bold: true, color: { argb: BRAND.headerText }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col?.required ? BRAND.requiredHeader : BRAND.header },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });

  // guidance row
  const helpRow = ws.addRow(
    COLUMNS.reduce((acc, col) => {
      acc[col.key] = `${col.required ? "REQUIRED — " : ""}${col.help}`;
      return acc;
    }, {})
  );
  helpRow.height = 44;
  helpRow.eachCell((cell) => {
    cell.font = { italic: true, size: 9, color: { argb: "FF5A6B68" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.help } };
    cell.alignment = { vertical: "top", wrapText: true };
  });

  // example row
  const exampleRow = ws.addRow(
    COLUMNS.reduce((acc, col) => {
      acc[col.key] = col.example ?? "";
      return acc;
    }, {})
  );
  exampleRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.example } };
    cell.alignment = { vertical: "top", wrapText: true };
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  /* ---------------- Instructions ---------------- */

  const info = wb.addWorksheet("Instructions");
  info.columns = [
    { header: "Column", key: "header", width: 32 },
    { header: "Required", key: "required", width: 12 },
    { header: "Type", key: "type", width: 12 },
    { header: "What to put in it", key: "help", width: 90 },
  ];

  info.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BRAND.headerText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.header } };
  });

  COLUMNS.forEach((col) => {
    const row = info.addRow({
      header: col.header,
      required: col.required ? "Yes" : "",
      type: col.type,
      help: col.help,
    });
    row.alignment = { wrapText: true, vertical: "top" };
  });

  info.addRow({});
  info.addRow({
    header: "Notes",
    help:
      `Delete rows 2 and 3 (guidance + example) before importing. ` +
      `Gallery columns accept multiple values separated by "${GALLERY_SEPARATOR}" and are matched by position. ` +
      `Boolean columns accept TRUE/FALSE, YES/NO or 1/0. ` +
      `Rows whose Slug matches an existing article update that article in upsert mode; ` +
      `blank cells never overwrite existing values.`,
  }).alignment = { wrapText: true, vertical: "top" };

  return wb.xlsx.writeBuffer();
};

/* =========================================================
   READ AN UPLOADED SHEET
========================================================= */

const cellToString = (value) => {
  if (value === null || value === undefined) return "";

  // exceljs rich text
  if (typeof value === "object") {
    if (value.richText) return value.richText.map((t) => t.text).join("");
    if (value.text !== undefined) return String(value.text);
    if (value.hyperlink) return String(value.hyperlink);
    if (value.result !== undefined) return String(value.result); // formula
    if (value instanceof Date) return value.toISOString();
    if (value.error) return "";
  }

  return String(value);
};

/**
 * Parse an uploaded xlsx/csv buffer into normalised rows.
 * @returns {Promise<{rows: object[], headers: string[], unknownHeaders: string[]}>}
 */
const parseSheet = async (buffer, fileName = "") => {
  const wb = new ExcelJS.Workbook();
  const isCsv = /\.csv$/i.test(fileName);

  if (isCsv) {
    const stream = Readable.from(buffer.toString("utf8"));
    await wb.csv.read(stream);
  } else {
    await wb.xlsx.load(buffer);
  }

  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], headers: [], unknownHeaders: [] };

  const headerRow = ws.getRow(1);
  const headers = [];
  const unknownHeaders = [];
  const columnKeys = [];

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const text = cellToString(cell.value).trim();
    headers[colNumber] = text;

    const key = text ? matchHeader(text) : null;
    columnKeys[colNumber] = key;

    if (text && !key) unknownHeaders.push(text);
  });

  const rows = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const record = { __row: rowNumber };
    let hasValue = false;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = columnKeys[colNumber];
      if (!key) return;

      const raw = cell.value;
      const value = raw instanceof Date ? raw : cellToString(raw).trim();

      if (value !== "" && value !== null) {
        record[key] = value;
        hasValue = true;
      }
    });

    if (hasValue) rows.push(record);
  });

  // Drop the sample sheet's guidance row if it survived a copy-paste.
  const cleaned = rows.filter((r) => {
    const title = String(r.title || "");
    return !/^REQUIRED —/i.test(title) && !/^Article headline\./i.test(title);
  });

  return { rows: cleaned, headers: headers.filter(Boolean), unknownHeaders };
};

/* =========================================================
   EXPORT ARTICLES -> WORKBOOK
========================================================= */

const flattenArticle = (n) => ({
  title: n.title || "",
  slug: n.slug || "",
  category: n.category?.name || "",
  subCategory: n.subCategory?.name || "",
  shortDescription: n.shortDescription || n.description || "",
  longDescription: n.longDescription || "",
  content: n.content || "",
  excerpt: n.excerpt || "",

  authorName: n.author?.name || "",
  authorImage: n.author?.image?.url || "",
  authorBio: n.author?.bio || "",
  authorDesignation: n.author?.designation || "",
  authorRedirectUrl: n.author?.redirectUrl || "",

  featuredImageUrl: n.featuredImage?.url || "",
  featuredImageRedirect: n.featuredImage?.redirectUrl || "",
  featuredImageAlt: n.featuredImage?.alt || "",
  featuredImageCaption: n.featuredImage?.caption || "",
  featuredImageCredit: n.featuredImage?.credit || "",

  galleryImages: (n.gallery || []).map((g) => g.url).join(GALLERY_SEPARATOR),
  galleryRedirects: (n.gallery || []).map((g) => g.redirectUrl || "").join(GALLERY_SEPARATOR),
  galleryCaptions: (n.gallery || []).map((g) => g.caption || "").join(GALLERY_SEPARATOR),
  galleryAlts: (n.gallery || []).map((g) => g.alt || "").join(GALLERY_SEPARATOR),
  galleryCredits: (n.gallery || []).map((g) => g.credit || "").join(GALLERY_SEPARATOR),

  videoUrl: n.videos?.[0]?.url || "",
  videoThumbnail: n.videos?.[0]?.thumbnail?.url || "",
  videoRedirect: n.videos?.[0]?.redirectUrl || "",

  tags: (n.tagNames || []).join(", "),
  priority: n.priority ?? 0,
  featured: n.featured ? "TRUE" : "FALSE",
  trending: n.trending ? "TRUE" : "FALSE",
  popular: n.popular ? "TRUE" : "FALSE",
  breakingNews: n.breakingNews ? "TRUE" : "FALSE",
  editorsPick: n.editorsPick ? "TRUE" : "FALSE",
  status: n.status || "",
  publishedDate: n.publishedDate ? new Date(n.publishedDate).toISOString().slice(0, 10) : "",
  scheduledAt: n.scheduledAt ? new Date(n.scheduledAt).toISOString() : "",
  readTime: n.readTime || "",

  language: n.language || "",
  country: n.country || "",
  region: n.region || "",
  destination: n.destination || "",

  sourceName: n.sourceName || "",
  sourceUrl: n.sourceUrl || "",
  canonicalUrl: n.canonicalUrl || "",

  metaTitle: n.metaTitle || n.seoTitle || "",
  metaDescription: n.metaDescription || n.seoDescription || "",
  focusKeyword: n.focusKeyword || "",
  robots: n.robots || "",
  ogImage: n.ogImage?.url || "",
  twitterImage: n.twitterImage?.url || "",
  schema: n.schemaMarkup ? JSON.stringify(n.schemaMarkup) : "",

  externalLink: n.externalLink || "",
  ctaLabel: n.cta?.label || "",
  ctaUrl: n.cta?.url || "",
  adCode: n.advertisement?.code || "",
  adPosition: n.advertisement?.position || "",
});

/** @returns {Promise<Buffer>} */
const buildExportWorkbook = async (articles = []) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TheSavingDeck CMS";

  const ws = wb.addWorksheet("Articles", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.min(48, Math.max(16, col.header.length + 6)),
  }));

  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BRAND.headerText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.header } };
  });

  articles.forEach((a) => ws.addRow(flattenArticle(a)));

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  return wb.xlsx.writeBuffer();
};

module.exports = {
  buildSampleWorkbook,
  buildExportWorkbook,
  parseSheet,
  flattenArticle,
};
