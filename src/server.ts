import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { PORT } from "./config/env.js";
import { initBookingModel } from "./models/booking.model.js";
import { initSocketServer } from "./services/socket.service.js";
import { log } from "./config/logger.js";

const server = createServer(app);
const io = new Server(server);

initSocketServer(io);

const start = async (): Promise<void> => {
  await initBookingModel();
  server.listen(PORT, () => {
    log("server_started", { port: PORT });
  });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
