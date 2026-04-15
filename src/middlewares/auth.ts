import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types/api-error.js";

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.session.isAdmin) {
    next();
    return;
  }
  next(new ApiError(403, "Acceso admin requerido."));
};
