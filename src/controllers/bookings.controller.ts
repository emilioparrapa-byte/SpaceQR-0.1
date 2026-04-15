import { Request, Response, NextFunction } from "express";
import {
  cancelBooking,
  createBooking,
  getBookingsForDate,
  moveBooking,
} from "../services/booking.service.js";

export const getBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date } = req.params as { date: string };
    const bookings = await getBookingsForDate(date);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const postBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date, slot, userName, email } = req.body;
    const result = await createBooking(date, slot, userName, email);
    res.json({ message: "Reservación exitosa.", id: result.id });
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date, slot } = req.params as { date: string; slot: string };
    const { userName, adminPw } = req.body;
    const isAdmin = !!req.session.isAdmin;
    await cancelBooking(date, slot, userName, adminPw, isAdmin);
    res.json({ message: "Reservación cancelada." });
  } catch (error) {
    next(error);
  }
};

export const postMoveBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date, fromSlot, toSlot } = req.body;
    await moveBooking(date, fromSlot, toSlot);
    res.json({ message: "Reserva reasignada correctamente." });
  } catch (error) {
    next(error);
  }
};
