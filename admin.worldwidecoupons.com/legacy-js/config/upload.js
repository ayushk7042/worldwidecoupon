const multer = require("multer");
const cloudinary = require("./cloudinary");

/**
 * Multer storage engine that streams straight into Cloudinary.
 *
 * Written by hand rather than pulling in `multer-storage-cloudinary`, which
 * peer-depends on cloudinary v1 while this project runs v2.
 */
const ROOT_FOLDER = "thesavingdeck";

const safeFolder = (req) =>
  (req.body?.folder || req.query?.folder || "uncategorized")
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/^\/+|\/+$/g, "") || "uncategorized";

class CloudinaryStorage {
  _handleFile(req, file, cb) {
    const isVideo = file.mimetype.startsWith("video/");

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${ROOT_FOLDER}/${safeFolder(req)}`,
        resource_type: isVideo ? "video" : "image",
        // keep the original; sizing happens through delivery URLs
        transformation: isVideo ? undefined : [{ quality: "auto:good", fetch_format: "auto" }],
      },
      (err, result) => {
        if (err) return cb(err);

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
        });
      }
    );

    file.stream.pipe(stream);

    // a client that aborts mid-upload must not leave the stream dangling
    file.stream.on("error", (err) => {
      stream.destroy();
      cb(err);
    });
  }

  _removeFile(req, file, cb) {
    if (!file.public_id) return cb(null);
    cloudinary.uploader
      .destroy(file.public_id, { resource_type: file.resource_type || "image" })
      .then(() => cb(null))
      .catch(cb);
  }
}

const upload = multer({
  storage: new CloudinaryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
    files: 30, // bulk upload cap per request
  },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
    if (!ok) return cb(new Error("Only image and video files are allowed"));
    cb(null, true);
  },
});

/** Build a resized delivery URL from a Cloudinary secure_url. */
const cloudinaryThumb = (url = "", width = 400) => {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${width},q_auto,f_auto/`);
};

module.exports = { upload, cloudinary, cloudinaryThumb, ROOT_FOLDER };
