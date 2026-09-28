import { v2 as cloudinary } from "cloudinary";
import { env, hasCloudinary } from "./env.js";

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Builds a resized delivery URL from a Cloudinary `secure_url`. */
export function cloudinaryThumb(url = "", width = 400): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${width},q_auto,f_auto/`);
}

export { cloudinary, hasCloudinary };
