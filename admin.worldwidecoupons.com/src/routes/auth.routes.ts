import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import {
  requireAdmin,
  requireSuperadmin,
} from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam } from "../validators/common.js";
import {
  changePasswordBody,
  loginBody,
  registerAdminBody,
  updateAdminBody,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/login", authLimiter, validate({ body: loginBody }), auth.login);
router.post("/logout", auth.logout);

router.get("/me", requireAdmin, auth.me);

router.post(
  "/change-password",
  requireAdmin,
  authLimiter,
  validate({ body: changePasswordBody }),
  auth.changePassword
);

/* ---------- team management ---------- */

router.get("/admins", requireAdmin, requireSuperadmin, auth.listAdmins);

router.post(
  "/admins",
  requireAdmin,
  requireSuperadmin,
  validate({ body: registerAdminBody }),
  auth.createAdmin
);

router.put(
  "/admins/:id",
  requireAdmin,
  requireSuperadmin,
  validate({ params: idParam, body: updateAdminBody }),
  auth.updateAdmin
);

router.delete(
  "/admins/:id",
  requireAdmin,
  requireSuperadmin,
  validate({ params: idParam }),
  auth.deleteAdmin
);

export default router;
