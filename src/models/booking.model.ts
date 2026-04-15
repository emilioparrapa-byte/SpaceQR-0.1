import { allQuery, getQuery, runQuery } from "../config/database.js";

export interface BookingRow {
  id: number;
  date: string;
  slot: string;
  userName: string;
  bookedAt: string;
}

export interface BookingMap {
  [slot: string]: { userName: string; bookedAt: string };
}

export const initBookingModel = async (): Promise<void> => {
  await runQuery(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    slot TEXT NOT NULL,
    userName TEXT NOT NULL,
    bookedAt TEXT NOT NULL,
    UNIQUE(date, slot)
  )`);
};

export const findBookingsByDate = async (date: string): Promise<BookingRow[]> =>
  allQuery<BookingRow>("SELECT * FROM bookings WHERE date = ?", [date]);

export const findBookingByDateSlot = async (
  date: string,
  slot: string,
): Promise<BookingRow | undefined> =>
  getQuery<BookingRow>("SELECT * FROM bookings WHERE date = ? AND slot = ?", [date, slot]);

export const countBookingsByDateAndUser = async (
  date: string,
  userName: string,
): Promise<number> => {
  const row = await getQuery<{ count: number }>(
    "SELECT COUNT(*) as count FROM bookings WHERE date = ? AND userName = ?",
    [date, userName],
  );
  return row?.count ?? 0;
};

export const insertBooking = async (
  date: string,
  slot: string,
  userName: string,
  bookedAt: string,
): Promise<number> => {
  const result = await runQuery(
    "INSERT INTO bookings (date, slot, userName, bookedAt) VALUES (?, ?, ?, ?)",
    [date, slot, userName, bookedAt],
  );
  return result.lastID || 0;
};

export const deleteBookingByDateSlot = async (
  date: string,
  slot: string,
): Promise<number> => {
  const result = await runQuery("DELETE FROM bookings WHERE date = ? AND slot = ?", [date, slot]);
  return result.changes || 0;
};

export const moveBookingSlot = async (
  date: string,
  fromSlot: string,
  toSlot: string,
): Promise<number> => {
  const result = await runQuery(
    "UPDATE bookings SET slot = ? WHERE date = ? AND slot = ?",
    [toSlot, date, fromSlot],
  );
  return result.changes || 0;
};

export const deleteBookingsByDate = async (date: string): Promise<number> => {
  const result = await runQuery("DELETE FROM bookings WHERE date = ?", [date]);
  return result.changes || 0;
};

export const searchBookingsByUserName = async (
  name: string,
): Promise<BookingRow[]> =>
  allQuery<BookingRow>(
    "SELECT * FROM bookings WHERE userName LIKE ? ORDER BY date DESC, slot ASC LIMIT 50",
    [`%${name}%`],
  );

export const findBookingsFromDate = async (
  from: string,
): Promise<BookingRow[]> =>
  allQuery<BookingRow>("SELECT * FROM bookings WHERE date >= ?", [from]);

export const findBookingsBetweenDates = async (
  from: string,
  to: string,
): Promise<BookingRow[]> =>
  allQuery<BookingRow>(
    "SELECT * FROM bookings WHERE date >= ? AND date <= ? ORDER BY date ASC, slot ASC",
    [from, to],
  );

export const findBookingsForExport = async (
  from?: string,
  to?: string,
): Promise<BookingRow[]> => {
  if (from && to) {
    return findBookingsBetweenDates(from, to);
  }
  if (from) {
    return allQuery<BookingRow>("SELECT * FROM bookings WHERE date >= ? ORDER BY date ASC, slot ASC", [from]);
  }
  return allQuery<BookingRow>("SELECT * FROM bookings ORDER BY date ASC, slot ASC", []);
};
