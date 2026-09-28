import type { Request } from "express";
import multer, { type StorageEngine } from "multer";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary, hasCloudinary } from "./cloudinary.js";
import { env } from "./env.js";

/**
 * Everything Cloudinary hands back that we care about, stitched onto the
 * Multer file so controllers can persist it without a second round trip.
 */
export interface UploadedFile extends Express.Multer.File {
  public_id?: string;
  secure_url?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  resource_type?: string;
}

const safeFolder = (req: Request): string => {
  const raw =
    (req.body as Record<string, unknown> | undefined)?.folder ??
    req.query?.folder ??
    "uncategorized";

  const cleaned = String(raw)
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/^\/+|\/+$/g, "");

  return cleaned || "uncategorized";
};

/**
 * Streams straight into Cloudinary rather than buffering to disk first.
 *
 * Written by hand because `multer-storage-cloudinary` still peer-depends on
 * the cloudinary v1 client while this project runs v2.
 */
class CloudinaryStorage implements StorageEngine {
  _handleFile(
    req: Request,
    file: Express.Multer.File,
    cb: (error?: unknown, info?: Partial<UploadedFile>) => void
  ): void {
    if (!hasCloudinary) {
      cb(new Error("Media uploads are disabled — Cloudinary is not configured"));
      return;
    }

    const isVideo = file.mimetype.startsWith("video/");

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${safeFolder(req)}`,
        resource_type: isVideo ? "video" : "image",
        // Keep the original; sizing happens through delivery URLs.
        transformation: isVideo
          ? undefined
          : [{ quality: "auto:good", fetch_format: "auto" }],
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) return cb(error ?? new Error("Upload failed"));

        cb(null, {
          path: result.secure_url,
          secure_url: result.secure_url,
          filename: result.public_id,
          public_id: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          resource_type: result.resource_type,
          size: result.bytes,
        });
      }
    );

    file.stream.pipe(stream);

    // A client that aborts mid-upload must not leave the stream dangling.
    file.stream.on("error", (error) => {
      stream.destroy();
      cb(error);
    });
  }

  _removeFile(
    _req: Request,
    file: UploadedFile,
    cb: (error: Error | null) => void
  ): void {
    if (!file.public_id) return cb(null);

    cloudinary.uploader
      .destroy(file.public_id, { resource_type: file.resource_type || "image" })
      .then(() => cb(null))
      .catch((error: Error) => cb(error));
  }
}

export const upload = multer({
  storage: new CloudinaryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
    files: 30,
  },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");

    if (!allowed) return cb(new Error("Only image and video files are allowed"));
    cb(null, true);
  },
});
