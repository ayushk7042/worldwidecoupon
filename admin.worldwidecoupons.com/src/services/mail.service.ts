import nodemailer, { type Transporter } from "nodemailer";
import { env, hasMailer } from "../config/env.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!hasMailer) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT ?? 587,
    secure: (env.MAIL_PORT ?? 587) === 465,
    auth: { user: env.MAIL_USER, pass: env.MAIL_PASS },
  });

  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Sends, or quietly no-ops when SMTP is not configured.
 *
 * Mail is never the point of a request here — a contact reply that fails to
 * send must not roll back the reply that was already saved — so this resolves
 * with a status rather than throwing.
 */
export async function sendMail(
  input: MailInput
): Promise<{ sent: boolean; reason?: string }> {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn(`✉️  Mail skipped (SMTP not configured): ${input.subject}`);
    return { sent: false, reason: "SMTP is not configured" };
  }

  try {
    await mailer.sendMail({
      from: env.MAIL_FROM || `${env.SITE_NAME} <${env.MAIL_USER}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });

    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown mail error";
    console.error("✉️  Mail failed:", reason);
    return { sent: false, reason };
  }
}
