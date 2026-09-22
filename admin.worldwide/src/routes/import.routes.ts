import { Router } from "express";
import * as importController from "../controllers/import.controller.js";
import { canImport } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam } from "../validators/common.js";

const router = Router();

router.use(...canImport);

router.post("/preview", importController.csvUpload, importController.preview);
router.post("/wordpress", importController.csvUpload, importController.runImport);

router.get("/jobs", importController.listJobs);
router.get("/jobs/:id", validate({ params: idParam }), importController.getJob);
router.post(
  "/jobs/:id/rollback",
  validate({ params: idParam }),
  importController.rollback
);

export default router;
