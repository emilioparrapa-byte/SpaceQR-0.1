import express from "express";
import sqlite3 from "sqlite3";
import session from "express-session";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";

dotenv.config();

const __dirname = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));

const app = express();
const server = createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const ADMIN_PW = process.env.ADMIN_PW || "flujo2024";
const SESSION_SECRET = process.env.SESSION_SECRET || "your-secret-key";
const EMAIL_HOST = process.env.EMAIL_HOST || "";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE = process.env.EMAIL_SECURE === "true";
const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@campana-unison.local";

// ─── Logging ──────────────────────────────────────────────────────────────────
const LOGS_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);

const log = (action, details = {}) => {
  const entry = { ts: new Date().toISOString(), action, ...details };
  const line = JSON.stringify(entry);
  console.log(line);
  const file = path.join(LOGS_DIR, `${new Date().toISOString().slice(0, 10)}.log`);
  fs.appendFileSync(file, line + "\n");
};

// ─── Email ────────────────────────────────────────────────────────────────────
const emailTransporter = EMAIL_HOST && EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })
  : null;

const sendConfirmationEmail = async (email, date, slot, name) => {
  if (!emailTransporter || !email) return;
  try {
    await emailTransporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: "Confirmación de reservación - Campana de Flujo Laminar",
      text: `Hola ${name},\n\nTu reservación para el ${date} en el horario ${slot} ha sido confirmada.\n\nGracias.`,
      html: `<p>Hola <strong>${name}</strong>,</p><p>Tu reservación para el <strong>${date}</strong> en el horario <strong>${slot}</strong> ha sido confirmada.</p><p>Gracias.</p>`,
    });
  } catch (err) {
    log("email_error", { email, error: err.message });
  }
};

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: "Límite de reservaciones por hora alcanzado." },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de login. Intenta en 15 minutos." },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use("/api/", generalLimiter);
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  }),
);

// Request logger
app.use((req, _res, next) => {
  if (req.path.startsWith("/api/")) {
    log("request", { method: req.method, path: req.path, ip: req.ip });
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

// ─── Database ─────────────────────────────────────────────────────────────────
const db = new sqlite3.Database("./bookings.db", (err) => {
  if (err) {
    log("db_error", { error: err.message });
  } else {
    log("db_connected");
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      slot TEXT NOT NULL,
      userName TEXT NOT NULL,
      bookedAt TEXT NOT NULL,
      UNIQUE(date, slot)
    )`);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const getNormalizedDate = (value) => new Date(`${value}T00:00:00`);
const isValidBookingDate = (dateStr) => {
  if (!isValidDateString(dateStr)) return false;
  const date = getNormalizedDate(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 6);
  return date >= today && date <= maxDate;
};

// All 30-min slots from 07:00 to 22:00 (30 slots)
const ALL_SLOTS = (() => {
  const slots = [];
  for (let h = 7; h < 22; h++) {
    slots.push(`${pad(h)}:00`);
    slots.push(`${pad(h)}:30`);
  }
  return slots;
})();

// ─── API: Bookings ────────────────────────────────────────────────────────────
app.get("/api/bookings/:date", (req, res) => {
  const { date } = req.params;
  if (!isValidBookingDate(date)) {
    return res.status(400).json({ error: "Fecha inválida. Usa hoy o los próximos 7 días." });
  }
  db.all("SELECT * FROM bookings WHERE date = ?", [date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const bookings = {};
    rows.forEach((row) => {
      bookings[row.slot] = { userName: row.userName, bookedAt: row.bookedAt };
    });
    res.json(bookings);
  });
});

app.post("/api/bookings", bookingLimiter, async (req, res) => {
  const { date, slot, userName, email } = req.body;
  if (!date || !slot || !userName) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }
  if (!isValidBookingDate(date)) {
    return res.status(400).json({ error: "Fecha inválida. Usa hoy o los próximos 7 días." });
  }

  db.get("SELECT * FROM bookings WHERE date = ? AND slot = ?", [date, slot], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(409).json({ error: "Horario ya reservado." });

    db.all(
      "SELECT COUNT(*) as count FROM bookings WHERE date = ? AND userName = ?",
      [date, userName],
      (err2, rows) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (rows[0].count >= 4) {
          return res.status(400).json({ error: "Límite de 2 horas alcanzado para este día." });
        }

        db.run(
          "INSERT INTO bookings (date, slot, userName, bookedAt) VALUES (?, ?, ?, ?)",
          [date, slot, userName, new Date().toISOString()],
          async function (err3) {
            if (err3) return res.status(500).json({ error: err3.message });
            req.session.userName = userName;
            log("booking_created", { date, slot, userName });
            res.json({ message: "Reservación exitosa.", id: this.lastID });
            emitBookingUpdate(date);
            await sendConfirmationEmail(email, date, slot, userName);
          },
        );
      },
    );
  });
});

app.delete("/api/bookings/:date/:slot", (req, res) => {
  const { date, slot } = req.params;
  const { userName, adminPw } = req.body;

  if (!isValidBookingDate(date)) {
    return res.status(400).json({ error: "Fecha inválida." });
  }

  db.get("SELECT * FROM bookings WHERE date = ? AND slot = ?", [date, slot], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Reserva no encontrada." });

    const hasAdminAccess = req.session.isAdmin || adminPw === ADMIN_PW;
    if (!hasAdminAccess && (!userName || userName.toLowerCase() !== row.userName.toLowerCase())) {
      return res.status(403).json({ error: "No autorizado." });
    }

    db.run("DELETE FROM bookings WHERE date = ? AND slot = ?", [date, slot], function (delErr) {
      if (delErr) return res.status(500).json({ error: delErr.message });
      log("booking_cancelled", { date, slot, cancelledBy: userName || "admin" });
      res.json({ message: "Reservación cancelada." });
      emitBookingUpdate(date);
    });
  });
});

// ─── API: Move booking (admin) ────────────────────────────────────────────────
app.post("/api/bookings/move", (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Acceso admin requerido." });

  const { date, fromSlot, toSlot } = req.body;
  if (!date || !fromSlot || !toSlot) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }
  if (!isValidBookingDate(date)) return res.status(400).json({ error: "Fecha inválida." });
  if (fromSlot === toSlot) return res.status(400).json({ error: "Elige un horario diferente." });

  db.get("SELECT * FROM bookings WHERE date = ? AND slot = ?", [date, fromSlot], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Reserva original no encontrada." });

    db.get("SELECT * FROM bookings WHERE date = ? AND slot = ?", [date, toSlot], (err2, existing) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (existing) return res.status(409).json({ error: "El horario destino ya está reservado." });

      db.run(
        "UPDATE bookings SET slot = ? WHERE date = ? AND slot = ?",
        [toSlot, date, fromSlot],
        function (updErr) {
          if (updErr) return res.status(500).json({ error: updErr.message });
          log("booking_moved", { date, fromSlot, toSlot, userName: row.userName });
          res.json({ message: "Reserva reasignada correctamente." });
          emitBookingUpdate(date);
        },
      );
    });
  });
});

// ─── API: Stats ───────────────────────────────────────────────────────────────
// Public stats for a specific date
app.get("/api/stats/:date", (req, res) => {
  const { date } = req.params;
  if (!isValidBookingDate(date)) {
    return res.status(400).json({ error: "Fecha inválida." });
  }
  db.all("SELECT * FROM bookings WHERE date = ?", [date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = ALL_SLOTS.length;
    const booked = rows.length;
    const free = total - booked;
    const occupancyPct = Math.round((booked / total) * 100);

    // Occupancy by hour
    const byHour = {};
    for (let h = 7; h < 22; h++) {
      byHour[`${pad(h)}:00`] = { booked: 0, total: 2 };
    }
    rows.forEach((r) => {
      const hKey = r.slot.endsWith(":30")
        ? `${r.slot.slice(0, 2)}:00`
        : r.slot;
      if (byHour[hKey]) byHour[hKey].booked++;
    });

    // Peak hour
    let peakHour = null;
    let peakCount = 0;
    Object.entries(byHour).forEach(([h, v]) => {
      if (v.booked > peakCount) { peakCount = v.booked; peakHour = h; }
    });

    // Next available slot
    const bookedSet = new Set(rows.map((r) => r.slot));
    const nextFree = ALL_SLOTS.find((s) => !bookedSet.has(s)) || null;

    res.json({ date, total, booked, free, occupancyPct, byHour, peakHour, nextFree });
  });
});

// Admin global stats (week view)
app.get("/api/admin/stats", (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Acceso admin requerido." });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  db.all("SELECT * FROM bookings WHERE date >= ?", [dates[0]], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const userCounts = {};
    rows.forEach((r) => {
      userCounts[r.userName] = (userCounts[r.userName] || 0) + 1;
    });
    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const perDate = {};
    dates.forEach((d) => { perDate[d] = { booked: 0, total: ALL_SLOTS.length }; });
    rows.forEach((r) => {
      if (perDate[r.date]) perDate[r.date].booked++;
    });

    const slotCounts = {};
    rows.forEach((r) => {
      slotCounts[r.slot] = (slotCounts[r.slot] || 0) + 1;
    });
    const topSlots = Object.entries(slotCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slot, count]) => ({ slot, count }));

    res.json({
      totalBookingsWeek: rows.length,
      uniqueUsersWeek: Object.keys(userCounts).length,
      topUsers,
      topSlots,
      perDate,
    });
  });
});

// ─── API: CSV Export (admin) ──────────────────────────────────────────────────
app.get("/api/admin/export", (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Acceso admin requerido." });

  const { from, to } = req.query;
  let query = "SELECT * FROM bookings";
  const params = [];

  if (from && isValidDateString(from)) {
    query += " WHERE date >= ?";
    params.push(from);
    if (to && isValidDateString(to)) {
      query += " AND date <= ?";
      params.push(to);
    }
  }
  query += " ORDER BY date ASC, slot ASC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const header = "id,fecha,horario,nombre,reservadoEn\n";
    const csv = rows
      .map((r) =>
        `${r.id},"${r.date}","${r.slot}","${r.userName.replace(/"/g, '""')}","${r.bookedAt}"`,
      )
      .join("\n");

    const filename = `reservaciones_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + header + csv); // BOM para Excel
    log("csv_export", { rows: rows.length, from, to });
  });
});

// ─── API: DB Backup download (admin) ─────────────────────────────────────────
app.get("/api/admin/backup", (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Acceso admin requerido." });

  const dbPath = path.join(__dirname, "bookings.db");
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: "Base de datos no encontrada." });
  }
  const filename = `bookings_backup_${new Date().toISOString().slice(0, 10)}.db`;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(dbPath).pipe(res);
  log("db_backup_downloaded");
});

// ─── API: Search user bookings (admin) ───────────────────────────────────────
app.get("/api/admin/user/:name", (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Acceso admin requerido." });

  const name = decodeURIComponent(req.params.name);
  db.all(
    "SELECT * FROM bookings WHERE userName LIKE ? ORDER BY date DESC, slot ASC LIMIT 50",
    [`%${name}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

// ─── API: Admin auth ──────────────────────────────────────────────────────────
app.post("/api/admin/login", adminLimiter, (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PW) {
    req.session.isAdmin = true;
    log("admin_login", { ip: req.ip });
    res.json({ message: "Login de admin exitoso." });
  } else {
    log("admin_login_failed", { ip: req.ip });
    res.status(401).json({ error: "Contraseña incorrecta." });
  }
});

app.post("/api/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  res.json({ message: "Sesión admin cerrada." });
});

app.get("/api/admin/status", (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

app.delete("/api/admin/bookings/:date", (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Acceso admin requerido." });

  const { date } = req.params;
  db.run("DELETE FROM bookings WHERE date = ?", [date], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    log("admin_delete_all", { date, deleted: this.changes });
    res.json({ message: "Todas las reservaciones eliminadas.", deleted: this.changes });
    emitBookingUpdate(date);
  });
});

// ─── Serve index ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  log("socket_connected", { id: socket.id });
  socket.on("disconnect", () => {
    log("socket_disconnected", { id: socket.id });
  });
});

function emitBookingUpdate(date) {
  db.all("SELECT * FROM bookings WHERE date = ?", [date], (err, rows) => {
    if (!err) {
      const bookings = {};
      rows.forEach((row) => {
        bookings[row.slot] = { userName: row.userName, bookedAt: row.bookedAt };
      });
      io.emit("bookingUpdate", { date, bookings });
    }
  });
}

// ─── Auto-backup SQLite cada 24h ──────────────────────────────────────────────
const BACKUP_DIR = path.join(__dirname, "backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

setInterval(() => {
  const src = path.join(__dirname, "bookings.db");
  const dest = path.join(
    BACKUP_DIR,
    `bookings_${new Date().toISOString().slice(0, 10)}.db`,
  );
  if (!fs.existsSync(dest)) {
    try {
      fs.copyFileSync(src, dest);
      log("auto_backup", { dest });
    } catch (e) {
      log("auto_backup_error", { error: e.message });
    }
  }
}, 24 * 60 * 60 * 1000);

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  log("server_started", { port: PORT });
});
