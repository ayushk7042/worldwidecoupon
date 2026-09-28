import { Router } from "express";
import * as category from "../controllers/category.controller.js";
import { canDelete, canPublish } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam, slugParam } from "../validators/common.js";
import {
  createCategoryBody,
  listCategoriesQuery,
  reorderCategoriesBody,
  updateCategoryBody,
} from "../validators/category.validator.js";

const router = Router();

/* ---------- public reads ---------- */

router.get("/", validate({ query: listCategoriesQuery }), category.listCategories);
router.get("/menu", category.getMenu);

/* ---------- admin writes ---------- */

router.post(
  "/reorder",
  ...canPublish,
  validate({ body: reorderCategoriesBody }),
  category.reorderCategories
);

router.post("/refresh-counts", ...canPublish, category.refreshCounts);

router.post(
  "/",
  ...canPublish,
  validate({ body: createCategoryBody }),
  category.createCategory
);

router.put(
  "/:id",
  ...canPublish,
  validate({ params: idParam, body: updateCategoryBody }),
  category.updateCategory
);

router.delete(
  "/:id",
  ...canDelete,
  validate({ params: idParam }),
  category.deleteCategory
);

/* ---------- catch-all read (last) ---------- */

router.get("/:idOrSlug", validate({ params: slugParam }), category.getCategory);

export default router;
