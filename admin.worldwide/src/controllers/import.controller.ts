import multer from "multer";
import { ImportJobModel } from "../models/ImportJob.js";
import { CouponModel } from "../models/Coupon.js";
import { StoreModel } from "../models/Store.js";
import { CategoryModel } from "../models/Category.js";
import { importWordpressCsv } from "../services/import/importer.js";
import {
  isLegacyExcel,
  isSpreadsheetUpload,
  xlsxToCsv,
} from "../services/import/spreadsheet.js";
import { refreshCategoryCounts } from "../services/counters.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPagination, sendOk } from "../utils/response.js";

/**
 * The sheet is read into memory rather than streamed to disk: the real export
 * is about 1 MB, and holding it briefly is simpler than managing temp files.
 */
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();

    const ok =
      file.mimetype.includes("csv") ||
      file.mimetype === "text/plain" ||
      name.endsWith(".csv") ||
      isSpreadsheetUpload(file) ||
      // Accepted here so the handler can explain why `.xls` will not work,
      // rather than multer rejecting it with a generic upload error.
      isLegacyExcel(file);

    if (!ok) return cb(new Error("Upload a .csv or .xlsx file"));
    cb(null, true);
  },
}).single("file");

const uploadedFile = (req: Express.Request): Express.Multer.File => {
  const file = (req as { file?: Express.Multer.File }).file;
  if (!file) throw ApiError.badRequest("No file was uploaded");
  return file;
};

/** Both formats end up as CSV text, so one parser handles every upload. */
const readSheet = async (
  req: Express.Request
): Promise<{ csv: string; fileName: string; fileType: "csv" | "xlsx" }> => {
  const file = uploadedFile(req);

  if (isLegacyExcel(file) && !isSpreadsheetUpload(file)) {
    throw ApiError.badRequest(
      "The old .xls format is not supported — open it in Excel and save as .xlsx or .csv"
    );
  }

  if (isSpreadsheetUpload(file)) {
    return {
      csv: await xlsxToCsv(file.buffer),
      fileName: file.originalname,
      fileType: "xlsx",
    };
  }

  return {
    csv: file.buffer.toString("utf8"),
    fileName: file.originalname,
    fileType: "csv",
  };
};

/**
 * POST /api/import/preview
 * Parses and reports without writing anything, so an operator can see what a
 * messy export will do before it does it.
 */
export const preview = asyncHandler(async (req, res) => {
  const { csv, fileName, fileType } = await readSheet(req);

  const result = await importWordpressCsv(csv, {
    mode: "upsert",
    dryRun: true,
    fileName,
    fileType,
  });

  sendOk(res, {
    ...result,
    // The full list can run to hundreds of lines; the count is the headline.
    issues: result.issues.slice(0, 100),
  });
});

/** POST /api/import/wordpress?mode=upsert|replace */
export const runImport = asyncHandler(async (req, res) => {
  const mode = req.query.mode === "replace" ? "replace" : "upsert";
  const { csv, fileName, fileType } = await readSheet(req);

  const result = await importWordpressCsv(csv, {
    mode,
    fileName,
    fileType,
    adminId: req.admin ? String(req.admin._id) : null,
  });

  sendOk(res, { ...result, issues: result.issues.slice(0, 200) }, {
    message: `${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
  });
});

/** GET /api/import/jobs */
export const listJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);

  const [items, total] = await Promise.all([
    ImportJobModel.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-issues")
      .populate("createdByAdmin", "name email")
      .lean(),
    ImportJobModel.countDocuments(),
  ]);

  sendOk(res, items, {
    pagination: buildPagination(page, limit, total, items.length),
  });
});

/** GET /api/import/jobs/:id — includes the full issue report. */
export const getJob = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const job = await ImportJobModel.findById(id)
    .populate("createdByAdmin", "name email")
    .lean();

  if (!job) throw ApiError.notFound("Import job not found");

  sendOk(res, job);
});

/**
 * POST /api/import/jobs/:id/rollback
 *
 * Removes only what this batch created. Rows it *updated* are not restored —
 * an upsert overwrites in place and keeping a full before-image of every
 * document would make the job record enormous.
 */
export const rollback = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const job = await ImportJobModel.findById(id);
  if (!job) throw ApiError.notFound("Import job not found");

  if (job.status === "rolled_back") {
    throw ApiError.badRequest("This import has already been rolled back");
  }

  const [coupons, stores, categories] = await Promise.all([
    CouponModel.deleteMany({ _id: { $in: job.createdCouponIds } }),
    StoreModel.deleteMany({ _id: { $in: job.createdStoreIds } }),
    CategoryModel.deleteMany({ _id: { $in: job.createdCategoryIds } }),
  ]);

  job.status = "rolled_back";
  job.rolledBackAt = new Date();
  await job.save();

  await refreshCategoryCounts();

  sendOk(
    res,
    {
      couponsDeleted: coupons.deletedCount,
      storesDeleted: stores.deletedCount,
      categoriesDeleted: categories.deletedCount,
    },
    { message: "Import rolled back" }
  );
});
