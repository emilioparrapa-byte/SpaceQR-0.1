import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types/api-error.js";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : "Error interno del servidor.";
  res.status(500).json({ error: message });
};
