import { cloudinary, cloudinaryThumb, hasCloudinary } from "../config/cloudinary.js";
import type { UploadedFile } from "../config/upload.js";
import { MediaModel } from "../models/Media.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPagination, sendCreated, sendOk } from "../utils/response.js";
import { sanitizePlain } from "../utils/sanitize.js";
import { normalizeUrl } from "../utils/url.js";

const toResourceType = (value?: string): "image" | "video" | "raw" =>
  value === "video" ? "video" : value === "raw" ? "raw" : "image";

/** POST /api/media/upload — multipart, one or many files. */
export const uploadMedia = asyncHandler(async (req, res) => {
  if (!hasCloudinary) {
    throw ApiError.badRequest("Media uploads are disabled — Cloudinary is not configured");
  }

  const files = (req.files ?? []) as UploadedFile[];
  if (!files.length) throw ApiError.badRequest("No files were uploaded");

  const folder = sanitizePlain(req.body?.folder) || "uncategorized";

  const docs = await MediaModel.insertMany(
    files.map((file) => ({
      name: sanitizePlain(file.originalname) || file.public_id || "asset",
      originalName: file.originalname,
      folder,
      public_id: file.public_id,
      url: file.secure_url ?? file.path,
      secureUrl: file.secure_url,
      thumbnailUrl: cloudinaryThumb(file.secure_url ?? ""),
      resourceType: toResourceType(file.resource_type),
      format: file.format,
      width: file.width,
      height: file.height,
      bytes: file.bytes,
      uploadedBy: req.admin?._id ?? null,
    }))
  );

  sendCreated(res, docs, `${docs.length} file(s) uploaded`);
});

/**
 * POST /api/media/register — records an external URL without uploading.
 * Imported stores keep their logo on the origin's CDN, and re-hosting 200
 * brand logos we do not own would be both wasteful and legally awkward.
 */
export const registerMedia = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const url = normalizeUrl(body.url);

  if (!url) throw ApiError.badRequest("A valid URL is required");

  const media = await MediaModel.create({
    name: sanitizePlain(body.name) || url.split("/").pop() || "asset",
    folder: sanitizePlain(body.folder) || "external",
    url,
    secureUrl: url,
    thumbnailUrl: url,
    resourceType: toResourceType(String(body.resourceType ?? "image")),
    alt: sanitizePlain(body.alt),
    caption: sanitizePlain(body.caption),
    uploadedBy: req.admin?._id ?? null,
  });

  sendCreated(res, media.toJSON(), "Asset registered");
});

/** GET /api/media */
export const listMedia = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 40);

  const filter: Record<string, unknown> = {};

  if (req.query.folder && req.query.folder !== "all") {
    filter.folder = String(req.query.folder);
  }
  if (req.query.type && req.query.type !== "all") {
    filter.resourceType = String(req.query.type);
  }
  if (req.query.search) {
    filter.name = {
      $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }

  const [items, total, folders] = await Promise.all([
    MediaModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MediaModel.countDocuments(filter),
    MediaModel.distinct("folder"),
  ]);

  sendOk(res, items, {
    pagination: buildPagination(page, limit, total, items.length),
    meta: { folders },
  });
});

/** PATCH /api/media/:id — rename and edit the reusable alt/caption defaults. */
export const updateMedia = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const body = req.body as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  for (const key of ["name", "alt", "caption", "title", "credit", "folder"] as const) {
    if (body[key] !== undefined) patch[key] = sanitizePlain(body[key]);
  }
  if (Array.isArray(body.tags)) {
    patch.tags = (body.tags as unknown[]).map((tag) => sanitizePlain(tag)).filter(Boolean);
  }

  const media = await MediaModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!media) throw ApiError.notFound("Asset not found");

  sendOk(res, media.toJSON(), { message: "Asset updated" });
});

/** DELETE /api/media/:id — removes the row and, when we host it, the file. */
export const deleteMedia = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const media = await MediaModel.findByIdAndDelete(id);
  if (!media) throw ApiError.notFound("Asset not found");

  if (media.public_id && hasCloudinary) {
    // A failed remote delete must not fail the request — the row is already
    // gone, and an orphaned Cloudinary file is a cleanup job, not an error.
    await cloudinary.uploader
      .destroy(media.public_id, { resource_type: media.resourceType })
      .catch((error: unknown) => console.warn("Cloudinary delete failed:", error));
  }

  sendOk(res, { id }, { message: "Asset deleted" });
});
