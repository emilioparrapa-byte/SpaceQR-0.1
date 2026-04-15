import { ApiError } from "../types/api-error.js";
import { ALL_SLOTS, isValidBookingDate } from "../utils/date.js";
import {
  countBookingsByDateAndUser,
  deleteBookingByDateSlot,
  deleteBookingsByDate,
  findBookingByDateSlot,
  findBookingsByDate,
  findBookingsForExport,
  findBookingsFromDate,
  insertBooking,
  moveBookingSlot,
  searchBookingsByUserName,
  BookingMap,
  BookingRow,
} from "../models/booking.model.js";
import { ADMIN_PW } from "../config/env.js";
import { emitBookingUpdate } from "./socket.service.js";
import { sendConfirmationEmail } from "./email.service.js";

const mapBookings = (rows: BookingRow[]): BookingMap =>
  rows.reduce<BookingMap>((result, row) => {
    result[row.slot] = { userName: row.userName, bookedAt: row.bookedAt };
    return result;
  }, {});

export const getBookingsForDate = async (date: string): Promise<BookingMap> => {
  if (!isValidBookingDate(date)) {
    throw new ApiError(400, "Fecha inválida. Usa hoy o los próximos 7 días.");
  }

  const rows = await findBookingsByDate(date);
  return mapBookings(rows);
};

export const createBooking = async (
  date: string,
  slot: string,
  userName: string,
  email?: string,
): Promise<{ id: number }> => {
  if (!date || !slot || !userName) {
    throw new ApiError(400, "Faltan campos requeridos.");
  }

  if (!isValidBookingDate(date)) {
    throw new ApiError(400, "Fecha inválida. Usa hoy o los próximos 7 días.");
  }

  const existing = await findBookingByDateSlot(date, slot);
  if (existing) {
    throw new ApiError(409, "Horario ya reservado.");
  }

  const count = await countBookingsByDateAndUser(date, userName);
  if (count >= 4) {
    throw new ApiError(400, "Límite de 2 horas alcanzado para este día.");
  }

  const id = await insertBooking(date, slot, userName, new Date().toISOString());
  const bookings = mapBookings(await findBookingsByDate(date));
  emitBookingUpdate(date, bookings);
  await sendConfirmationEmail(email || "", date, slot, userName);

  return { id };
};

export const cancelBooking = async (
  date: string,
  slot: string,
  userName?: string,
  adminPw?: string,
  isAdmin = false,
): Promise<void> => {
  if (!isValidBookingDate(date)) {
    throw new ApiError(400, "Fecha inválida.");
  }

  const existing = await findBookingByDateSlot(date, slot);
  if (!existing) {
    throw new ApiError(404, "Reserva no encontrada.");
  }

  const hasAdminAccess = isAdmin || adminPw === ADMIN_PW;
  if (!hasAdminAccess && (!userName || userName.toLowerCase() !== existing.userName.toLowerCase())) {
    throw new ApiError(403, "No autorizado.");
  }

  await deleteBookingByDateSlot(date, slot);
  const bookings = mapBookings(await findBookingsByDate(date));
  emitBookingUpdate(date, bookings);
};

export const moveBooking = async (
  date: string,
  fromSlot: string,
  toSlot: string,
): Promise<void> => {
  if (!isValidBookingDate(date)) {
    throw new ApiError(400, "Fecha inválida.");
  }
  if (fromSlot === toSlot) {
    throw new ApiError(400, "Elige un horario diferente.");
  }

  const existing = await findBookingByDateSlot(date, fromSlot);
  if (!existing) {
    throw new ApiError(404, "Reserva original no encontrada.");
  }

  const destination = await findBookingByDateSlot(date, toSlot);
  if (destination) {
    throw new ApiError(409, "El horario destino ya está reservado.");
  }

  await moveBookingSlot(date, fromSlot, toSlot);
  const bookings = mapBookings(await findBookingsByDate(date));
  emitBookingUpdate(date, bookings);
};

export const getStatsForDate = async (date: string) => {
  if (!isValidBookingDate(date)) {
    throw new ApiError(400, "Fecha inválida.");
  }

  const rows = await findBookingsByDate(date);
  const total = ALL_SLOTS.length;
  const booked = rows.length;
  const free = total - booked;
  const occupancyPct = Math.round((booked / total) * 100);

  const byHour: Record<string, { booked: number; total: number }> = {};
  for (let h = 7; h < 22; h++) {
    byHour[`${String(h).padStart(2, "0")}:00`] = { booked: 0, total: 2 };
  }

  rows.forEach((r) => {
    const hKey = r.slot.endsWith(":30") ? `${r.slot.slice(0, 2)}:00` : r.slot;
    if (byHour[hKey]) byHour[hKey].booked++;
  });

  let peakHour: string | null = null;
  let peakCount = 0;
  Object.entries(byHour).forEach(([h, v]) => {
    if (v.booked > peakCount) {
      peakCount = v.booked;
      peakHour = h;
    }
  });

  const bookedSet = new Set(rows.map((r) => r.slot));
  const nextFree = ALL_SLOTS.find((s) => !bookedSet.has(s)) || null;

  return { date, total, booked, free, occupancyPct, byHour, peakHour, nextFree };
};

export const getAdminWeekStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const rows = await findBookingsFromDate(dates[0]);
  const userCounts: Record<string, number> = {};
  rows.forEach((r) => {
    userCounts[r.userName] = (userCounts[r.userName] || 0) + 1;
  });

  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const perDate: Record<string, { booked: number; total: number }> = {};
  dates.forEach((d) => {
    perDate[d] = { booked: 0, total: ALL_SLOTS.length };
  });
  rows.forEach((r) => {
    if (perDate[r.date]) perDate[r.date].booked++;
  });

  const slotCounts: Record<string, number> = {};
  rows.forEach((r) => {
    slotCounts[r.slot] = (slotCounts[r.slot] || 0) + 1;
  });

  const topSlots = Object.entries(slotCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slot, count]) => ({ slot, count }));

  return {
    totalBookingsWeek: rows.length,
    uniqueUsersWeek: Object.keys(userCounts).length,
    topUsers,
    topSlots,
    perDate,
  };
};

export const exportBookings = async (from?: string, to?: string): Promise<BookingRow[]> =>
  findBookingsForExport(from, to);

export const searchBookings = async (name: string): Promise<BookingRow[]> =>
  searchBookingsByUserName(name);

export const deleteBookingsForDate = async (date: string): Promise<number> =>
  deleteBookingsByDate(date);
