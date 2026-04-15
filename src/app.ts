import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { APP_ROOT, SESSION_SECRET } from "./config/env.js";
import { log } from "./config/logger.js";
import { generalLimiter } from "./middlewares/rateLimit.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { registerRoutes } from "./routes/index.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/", generalLimiter);
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  }),
);

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api/")) {
    log("request", { method: req.method, path: req.path, ip: req.ip });
  }
  next();
});

app.use(express.static(path.join(APP_ROOT, "public")));
registerRoutes(app);

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(APP_ROOT, "index.html"));
});

app.use(errorHandler);
