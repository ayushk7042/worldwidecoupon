import { Router } from "express";
import * as store from "../controllers/store.controller.js";
import {
  canDelete,
  canManageStores,
  optionalAdmin,
} from "../middlewares/auth.middleware.js";
import { revealLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam, slugParam } from "../validators/common.js";
import {
  bulkStoreStatusBody,
  createStoreBody,
  listStoresQuery,
  updateStoreBody,
} from "../validators/store.validator.js";

const router = Router();

/* ---------- public reads ---------- */

router.get("/", validate({ query: listStoresQuery }), store.listStores);
router.get("/letters", store.getLetterCounts);
router.get("/directory", store.getDirectory);

/* ---------- outbound ---------- */

router.get("/:id/go", revealLimiter, validate({ params: idParam }), store.goToStore);
router.post(
  "/:id/click",
  revealLimiter,
  validate({ params: idParam }),
  store.trackStoreClick
);

/* ---------- admin writes ---------- */

router.post(
  "/bulk/status",
  ...canManageStores,
  validate({ body: bulkStoreStatusBody }),
  store.bulkStoreStatus
);

router.post(
  "/",
  ...canManageStores,
  validate({ body: createStoreBody }),
  store.createStore
);

router.post(
  "/:id/refresh",
  ...canManageStores,
  validate({ params: idParam }),
  store.refreshStore
);

router.put(
  "/:id",
  ...canManageStores,
  validate({ params: idParam, body: updateStoreBody }),
  store.updateStore
);

router.delete("/:id", ...canDelete, validate({ params: idParam }), store.deleteStore);

/* ---------- catch-all read (last) ---------- */

router.get(
  "/:idOrSlug",
  optionalAdmin,
  validate({ params: slugParam }),
  store.getStore
);

export default router;
