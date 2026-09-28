const crypto = require("crypto");

const News = require("../models/News");
const ImportJob = require("../models/ImportJob");

const {
  buildSampleWorkbook,
  buildExportWorkbook,
  parseSheet,
} = require("../services/sheet.service");
const { rowToBody, validateRows } = require("../services/importRow.service");
const { buildNewsPayload, refreshTagCounts } = require("../services/newsPayload.service");
const { uniqueSlug } = require("../utils/newsHelpers");

/* =========================================================
   TUNING
========================================================= */

const CHUNK_SIZE = 25;            // rows written concurrently
const SYNC_ROW_LIMIT = 300;       // above this the import runs in the background
const MAX_SNAPSHOTS = 500;        // rollback snapshots kept per job
const MAX_STORED_ERRORS = 2000;

/* =========================================================
   SAMPLE + EXPORT
========================================================= */

/** GET /api/import/sample — downloadable, fully documented template */
exports.downloadSample = async (req, res) => {
  try {
    const buffer = await buildSampleWorkbook();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="thesavingdeck-article-import-template.xlsx"'
    );

    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("downloadSample error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/import/export?status=&category=&limit= — articles back out as xlsx */
exports.exportArticles = async (req, res) => {
  try {
    const query = { deletedAt: null };
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    if (req.query.category) query.category = req.query.category;

    const limit = Math.min(10000, parseInt(req.query.limit, 10) || 5000);

    const articles = await News.find(query)
      .populate("category subCategory")
      .sort({ publishedDate: -1 })
      .limit(limit)
      .lean();

    const buffer = await buildExportWorkbook(articles);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="thesavingdeck-articles-${Date.now()}.xlsx"`
    );

    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("exportArticles error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   VALIDATE / PREVIEW
========================================================= */

/**
 * POST /api/import/validate   (multipart, field "file")
 * Parses and validates without writing anything, and returns a preview.
 */
exports.validateSheet = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file received" });
    }

    const { rows, headers, unknownHeaders } = await parseSheet(
      req.file.buffer,
      req.file.originalname
    );

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "No data rows found. Check that row 1 holds the column headers.",
        headers,
      });
    }

    const { errors, summary } = await validateRows(rows);

    // which rows already exist -> would be updated rather than created
    const slugs = rows.map((r) => r.__slug).filter(Boolean);
    const existing = await News.find({ slug: { $in: slugs } }).select("slug").lean();
    const existingSlugs = new Set(existing.map((e) => e.slug));

    const errorRows = new Set(errors.map((e) => e.row));

    const preview = rows.slice(0, 25).map((r) => ({
      row: r.__row,
      title: r.title || "",
      slug: r.__slug || "",
      category: r.category || "",
      status: r.status || "published",
      action: existingSlugs.has(r.__slug) ? "update" : "create",
      hasImage: Boolean(r.featuredImageUrl),
      galleryCount: r.galleryImages ? String(r.galleryImages).split("|").length : 0,
      valid: !errorRows.has(r.__row),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          ...summary,
          willCreate: rows.filter((r) => !existingSlugs.has(r.__slug)).length,
          willUpdate: rows.filter((r) => existingSlugs.has(r.__slug)).length,
        },
        headers,
        unknownHeaders,
        errors: errors.slice(0, 500),
        preview,
      },
    });
  } catch (err) {
    console.error("validateSheet error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   IMPORT
========================================================= */

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * Writes one row. Returns { action, id, error }.
 */
const importOneRow = async (row, { mode, batchId, skipInvalid, errorRows }) => {
  if (skipInvalid && errorRows.has(row.__row)) {
    return { action: "skipped", reason: "validation" };
  }

  try {
    const body = rowToBody(row);
    const existing = row.__slug
      ? await News.findOne({ slug: row.__slug })
      : null;

    if (existing && mode === "create") {
      return { action: "skipped", reason: "duplicate" };
    }

    if (existing) {
      const before = existing.toObject();

      const { patch } = await buildNewsPayload(body, { isCreate: false });

      // blank cells never wipe existing data
      Object.keys(patch).forEach((k) => {
        if (patch[k] === undefined) delete patch[k];
      });

      patch.importBatchId = batchId;
      patch.autoUpdateEnabled = false;

      Object.assign(existing, patch);
      await existing.save();

      return { action: "updated", id: existing._id, before, tags: patch.tags };
    }

    const { patch } = await buildNewsPayload(body, { isCreate: true });

    if (!patch.title) return { action: "skipped", reason: "missing title" };
    if (!patch.category) return { action: "skipped", reason: "unknown category" };
    if (!patch.description) patch.description = (patch.excerpt || patch.title).slice(0, 300);

    patch.slug = await uniqueSlug(News, row.slug || patch.title);
    patch.createdBy = "import";
    patch.importBatchId = batchId;
    patch.importRowRef = String(row.__row);

    const created = await News.create(patch);

    return { action: "created", id: created._id, tags: patch.tags };
  } catch (err) {
    return { action: "error", message: err.message };
  }
};

/**
 * Runs the whole import and keeps the ImportJob document up to date so the UI
 * can poll progress on large sheets.
 */
const runImport = async ({ rows, errors, job, mode, skipInvalid }) => {
  const errorRows = new Set(errors.map((e) => e.row));
  const touchedTags = new Set();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const rowErrors = [];
  const createdIds = [];
  const snapshots = [];

  job.status = "importing";
  job.startedAt = new Date();
  await job.save();

  for (const group of chunk(rows, CHUNK_SIZE)) {
    const results = await Promise.all(
      group.map((row) =>
        importOneRow(row, { mode, batchId: job.batchId, skipInvalid, errorRows })
      )
    );

    results.forEach((result, i) => {
      const row = group[i];

      if (result.action === "created") {
        created += 1;
        createdIds.push(result.id);
      } else if (result.action === "updated") {
        updated += 1;
        if (snapshots.length < MAX_SNAPSHOTS) {
          snapshots.push({ newsId: result.id, before: result.before });
        }
      } else if (result.action === "skipped") {
        skipped += 1;
      } else if (result.action === "error") {
        rowErrors.push({
          row: row.__row,
          field: "-",
          message: result.message,
          value: row.title || "",
        });
      }

      (result.tags || []).forEach((t) => touchedTags.add(String(t)));
    });

    // progress checkpoint
    job.createdCount = created;
    job.updatedCount = updated;
    job.skippedCount = skipped;
    job.errorCount = errors.length + rowErrors.length;
    await job.save();
  }

  job.createdIds = createdIds;
  job.updatedSnapshots = snapshots;
  job.issues = [...errors, ...rowErrors].slice(0, MAX_STORED_ERRORS);
  job.errorCount = errors.length + rowErrors.length;
  job.status = "completed";
  job.finishedAt = new Date();
  await job.save();

  if (touchedTags.size) refreshTagCounts([...touchedTags]).catch(() => {});

  return { created, updated, skipped, rowErrors, snapshotsTruncated: updated > MAX_SNAPSHOTS };
};

/**
 * POST /api/import/run  (multipart, field "file")
 * Body: mode = "upsert" | "create", skipInvalid = "true" | "false"
 *
 * Sheets up to 300 rows import synchronously. Larger sheets return immediately
 * with a batchId; poll GET /api/import/:batchId for progress.
 */
exports.runImportSheet = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file received" });
    }

    const mode = req.body.mode === "create" ? "create" : "upsert";
    const skipInvalid = req.body.skipInvalid !== "false";

    const { rows } = await parseSheet(req.file.buffer, req.file.originalname);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "No data rows found" });
    }

    const { errors } = await validateRows(rows);

    if (!skipInvalid && errors.length) {
      return res.status(400).json({
        success: false,
        message: `${errors.length} validation error(s). Fix the sheet or enable "skip invalid rows".`,
        errors: errors.slice(0, 200),
      });
    }

    const batchId = crypto.randomUUID();

    const job = await ImportJob.create({
      batchId,
      fileName: req.file.originalname,
      fileType: /\.csv$/i.test(req.file.originalname) ? "csv" : "xlsx",
      mode,
      status: "validated",
      totalRows: rows.length,
      createdByAdmin: req.admin?._id,
    });

    // large sheets: acknowledge now, keep working in the background
    if (rows.length > SYNC_ROW_LIMIT) {
      runImport({ rows, errors, job, mode, skipInvalid }).catch(async (err) => {
        console.error("Background import failed:", err);
        job.status = "failed";
        job.issues = [
          ...(job.issues || []),
          { row: 0, field: "-", message: err.message, value: "" },
        ];
        await job.save().catch(() => {});
      });

      return res.status(202).json({
        success: true,
        batchId,
        async: true,
        totalRows: rows.length,
        message: `Importing ${rows.length} rows in the background. Poll /api/import/${batchId} for progress.`,
      });
    }

    const result = await runImport({ rows, errors, job, mode, skipInvalid });

    res.json({
      success: true,
      batchId,
      async: false,
      data: {
        totalRows: rows.length,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: [...errors, ...result.rowErrors].slice(0, 200),
        errorCount: errors.length + result.rowErrors.length,
      },
    });
  } catch (err) {
    console.error("runImportSheet error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   HISTORY / STATUS / ROLLBACK
========================================================= */

/** GET /api/import/history */
exports.importHistory = async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 25);

    const jobs = await ImportJob.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-updatedSnapshots -createdIds -issues")
      .populate("createdByAdmin", "name email")
      .lean();

    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/import/:batchId — progress + full error report */
exports.importStatus = async (req, res) => {
  try {
    const job = await ImportJob.findOne({ batchId: req.params.batchId })
      .select("-updatedSnapshots")
      .lean();

    if (!job) return res.status(404).json({ success: false, message: "Import not found" });

    res.json({
      success: true,
      data: {
        ...job,
        processed: (job.createdCount || 0) + (job.updatedCount || 0) + (job.skippedCount || 0),
        canRollback:
          job.status === "completed" &&
          Boolean(job.createdIds?.length || job.updatedCount),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/import/:batchId/rollback
 * Deletes everything the batch created and restores every snapshot it kept.
 */
exports.rollbackImport = async (req, res) => {
  try {
    const job = await ImportJob.findOne({ batchId: req.params.batchId });
    if (!job) return res.status(404).json({ success: false, message: "Import not found" });

    if (job.status === "rolled_back") {
      return res.status(400).json({ success: false, message: "Already rolled back" });
    }
    if (job.status === "importing") {
      return res
        .status(409)
        .json({ success: false, message: "Import still running — wait for it to finish" });
    }

    let deleted = 0;
    if (job.createdIds?.length) {
      const result = await News.deleteMany({ _id: { $in: job.createdIds } });
      deleted = result.deletedCount;
    }

    let restored = 0;
    for (const snap of job.updatedSnapshots || []) {
      if (!snap?.before?._id) continue;
      const { _id, __v, ...doc } = snap.before;
      await News.replaceOne({ _id }, doc).catch(() => {});
      restored += 1;
    }

    job.status = "rolled_back";
    job.rolledBackAt = new Date();
    await job.save();

    const notRestored = Math.max(0, (job.updatedCount || 0) - restored);

    res.json({
      success: true,
      message: `Rolled back: ${deleted} created article(s) deleted, ${restored} update(s) restored.`,
      deleted,
      restored,
      // be explicit rather than silently under-reporting
      notRestored,
      warning: notRestored
        ? `${notRestored} updated article(s) had no stored snapshot (cap is ${MAX_SNAPSHOTS} per import) and were left as-is.`
        : undefined,
    });
  } catch (err) {
    console.error("rollbackImport error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
