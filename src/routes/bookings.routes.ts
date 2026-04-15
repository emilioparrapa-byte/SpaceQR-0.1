import { Router } from "express";
import { bookingLimiter } from "../middlewares/rateLimit.js";
import {
  deleteBooking,
  getBookings,
  postBooking,
  postMoveBooking,
} from "../controllers/bookings.controller.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/:date", getBookings);
router.post("/", bookingLimiter, postBooking);
router.delete("/:date/:slot", deleteBooking);
router.post("/move", requireAdmin, postMoveBooking);

export default router;
