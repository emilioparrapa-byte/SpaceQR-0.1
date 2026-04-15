import { Request, Response, NextFunction } from "express";
import { ADMIN_PW } from "../config/env.js";
import {
  deleteBookingsForDate,
  exportBookings,
  getAdminWeekStats,
  searchBookings,
} from "../services/booking.service.js";
import { ApiError } from "../types/api-error.js";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { password } = req.body;
    if (password === ADMIN_PW) {
      req.session.isAdmin = true;
      res.json({ message: "Login de admin exitoso." });
      return;
    }
    throw new ApiError(401, "Contraseña incorrecta.");
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    req.session.isAdmin = false;
    res.json({ message: "Sesión admin cerrada." });
  } catch (error) {
    next(error);
  }
};

export const status = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json({ isAdmin: !!req.session.isAdmin });
  } catch (error) {
    next(error);
  }
};

export const getWeekStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await getAdminWeekStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const exportCsv = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = await exportBookings(from, to);
    const header = "id,fecha,horario,nombre,reservadoEn\n";
    const csv = rows
      .map(
        (r) =>
          `${r.id},"${r.date}","${r.slot}","${r.userName.replace(/"/g, '""')}","${r.bookedAt}"`,
      )
      .join("\n");

    const filename = `reservaciones_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + header + csv);
  } catch (error) {
    next(error);
  }
};

export const getUserBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const name = decodeURIComponent((req.params as { name: string }).name);
    const rows = await searchBookings(name);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

export const deleteAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date } = req.params as { date: string };
    const deleted = await deleteBookingsForDate(date);
    res.json({ message: "Todas las reservaciones eliminadas.", deleted });
  } catch (error) {
    next(error);
  }
};
