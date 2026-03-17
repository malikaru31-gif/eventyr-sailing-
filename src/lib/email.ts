import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(payload: EmailPayload) {
  const from = process.env.SMTP_FROM;
  const transporter = getTransporter();

  if (!transporter || !from) {
    console.warn("[email] Missing SMTP config, skipping email:", payload.subject);
    return { ok: false, skipped: true };
  }

  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return { ok: true };
}
