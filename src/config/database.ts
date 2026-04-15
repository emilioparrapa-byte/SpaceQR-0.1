import sqlite3 from "sqlite3";
import path from "path";
import { APP_ROOT } from "./env.js";
import { log } from "./logger.js";

const DB_PATH = path.join(APP_ROOT, "bookings.db");
export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    log("db_error", { error: err.message });
  } else {
    log("db_connected");
  }
});

export const runQuery = (sql: string, params: any[] = []): Promise<sqlite3.RunResult> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

export const getQuery = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row as T | undefined);
    });
  });

export const allQuery = <T = any>(sql: string, params: any[] = []): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows as T[]);
    });
  });
