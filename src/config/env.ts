import dotenv from "dotenv";
dotenv.config();

export const PORT = Number(process.env.PORT) || 3000;
export const ADMIN_PW = process.env.ADMIN_PW || "flujo2024";
export const SESSION_SECRET = process.env.SESSION_SECRET || "your-secret-key";
export const EMAIL_HOST = process.env.EMAIL_HOST || "";
export const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
export const EMAIL_SECURE = process.env.EMAIL_SECURE === "true";
export const EMAIL_USER = process.env.EMAIL_USER || "";
export const EMAIL_PASS = process.env.EMAIL_PASS || "";
export const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@campana-unison.local";
export const APP_ROOT = process.cwd();
