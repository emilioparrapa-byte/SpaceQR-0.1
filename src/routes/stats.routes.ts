import { Router } from "express";
import { getStats } from "../controllers/stats.controller.js";

const router = Router();
router.get("/:date", getStats);

export default router;
