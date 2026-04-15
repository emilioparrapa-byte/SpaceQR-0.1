import fs from "fs";
import path from "path";
import { APP_ROOT } from "./env.js";

const LOGS_DIR = path.join(APP_ROOT, "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

export const log = (action: string, details: Record<string, any> = {}): void => {
  const entry = { ts: new Date().toISOString(), action, ...details };
  const line = JSON.stringify(entry);
  console.log(line);
  const file = path.join(LOGS_DIR, `${new Date().toISOString().slice(0, 10)}.log`);
  fs.appendFileSync(file, line + "\n");
};
