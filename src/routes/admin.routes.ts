import { Router } from "express";
import { adminLimiter } from "../middlewares/rateLimit.js";
import { requireAdmin } from "../middlewares/auth.js";
import {
  deleteAllBookings,
  exportCsv,
  getUserBookings,
  getWeekStats,
  login,
  logout,
  status,
} from "../controllers/admin.controller.js";

const router = Router();

router.post("/login", adminLimiter, login);
router.post("/logout", logout);
router.get("/status", status);
router.get("/stats", requireAdmin, getWeekStats);
router.get("/export", requireAdmin, exportCsv);
router.get("/user/:name", requireAdmin, getUserBookings);
router.delete("/bookings/:date", requireAdmin, deleteAllBookings);

export default router;
