import { Request, Response, NextFunction } from "express";
import { getStatsForDate } from "../services/booking.service.js";

export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date } = req.params as { date: string };
    const stats = await getStatsForDate(date);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
