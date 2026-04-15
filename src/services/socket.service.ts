import { Server } from "socket.io";
import { BookingMap } from "../models/booking.model.js";

let io: Server | null = null;

export const initSocketServer = (server: Server): void => {
  io = server;
  io.on("connection", (socket) => {
    console.log(`socket_connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`socket_disconnected: ${socket.id}`);
    });
  });
};

export const emitBookingUpdate = (date: string, bookings: BookingMap): void => {
  if (!io) return;
  io.emit("bookingUpdate", { date, bookings });
};
