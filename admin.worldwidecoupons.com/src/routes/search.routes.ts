import { Router } from "express";
import * as search from "../controllers/search.controller.js";

const router = Router();

router.get("/", search.search);
router.get("/suggest", search.suggest);

export default router;
