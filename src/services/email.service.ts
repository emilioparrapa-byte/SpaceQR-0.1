import nodemailer from "nodemailer";
import {
  EMAIL_FROM,
  EMAIL_HOST,
  EMAIL_PASS,
  EMAIL_PORT,
  EMAIL_SECURE,
  EMAIL_USER,
} from "../config/env.js";
import { log } from "../config/logger.js";

const emailTransporter = EMAIL_HOST && EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })
  : null;

export const sendConfirmationEmail = async (
  email: string,
  date: string,
  slot: string,
  name: string,
): Promise<void> => {
  if (!emailTransporter || !email) return;

  try {
    await emailTransporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: "Confirmación de reservación - Campana de Flujo Laminar",
      text: `Hola ${name},\n\nTu reservación para el ${date} en el horario ${slot} ha sido confirmada.\n\nGracias.`,
      html: `<p>Hola <strong>${name}</strong>,</p><p>Tu reservación para el <strong>${date}</strong> en el horario <strong>${slot}</strong> ha sido confirmada.</p><p>Gracias.</p>`,
    });
  } catch (error) {
    log("email_error", { email, error: (error as Error).message });
  }
};
