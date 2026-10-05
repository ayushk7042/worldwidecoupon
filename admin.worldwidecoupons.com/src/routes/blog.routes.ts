import { Router } from "express";
import * as blog from "../controllers/blog.controller.js";
import { canDelete, canPublish, optionalAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  bulkDeleteBody,
  bulkStatusBody,
  createBlogBody,
  listBlogQuery,
  statusBody,
  updateBlogBody,
} from "../validators/blog.validator.js";
import { idParam, slugParam } from "../validators/common.js";

const router = Router();

/* ---------- public reads ---------- */

router.get("/", optionalAdmin, validate({ query: listBlogQuery }), blog.listBlogPosts);

/* ---------- admin writes ----------
   Literal paths before the `/:idOrSlug` catch-all, same reason as coupons. */

router.post(
  "/bulk/status",
  ...canPublish,
  validate({ body: bulkStatusBody }),
  blog.bulkStatus
);

router.post(
  "/bulk/delete",
  ...canDelete,
  validate({ body: bulkDeleteBody }),
  blog.bulkDelete
);

router.post("/", ...canPublish, validate({ body: createBlogBody }), blog.createBlogPost);

router.patch(
  "/:id/status",
  ...canPublish,
  validate({ params: idParam, body: statusBody }),
  blog.changeStatus
);

router.put(
  "/:id",
  ...canPublish,
  validate({ params: idParam, body: updateBlogBody }),
  blog.updateBlogPost
);

router.delete("/:id", ...canDelete, validate({ params: idParam }), blog.deleteBlogPost);

/* ---------- catch-all read (last) ---------- */

router.get(
  "/:idOrSlug",
  optionalAdmin,
  validate({ params: slugParam }),
  blog.getBlogPost
);

export default router;
