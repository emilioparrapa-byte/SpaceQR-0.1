import { Express } from "express";
import bookingRoutes from "./bookings.routes.js";
import statsRoutes from "./stats.routes.js";
import adminRoutes from "./admin.routes.js";

export const registerRoutes = (app: Express): void => {
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/admin", adminRoutes);
};
