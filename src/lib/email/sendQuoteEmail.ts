import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 3,
      maxMessages: 200,
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
    });
  }

  return smtpTransporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || getSmtpTransporter());
}

interface SendQuoteEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

async function sendViaResend(input: SendQuoteEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from =
    process.env.RESEND_FROM ??
    process.env.SMTP_FROM ??
    `"${input.fromName}" <onboarding@resend.dev>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: [
        {
          filename: input.pdfFilename,
          content: input.pdfBuffer.toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Resend error (${response.status})`);
  }

  return true;
}

async function sendViaSmtp(input: SendQuoteEmailInput): Promise<boolean> {
  const transporter = getSmtpTransporter();
  if (!transporter) return false;

  const fromEmail = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const mail: Mail.Options = {
    from: `"${input.fromName}" <${fromEmail}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: [
      {
        filename: input.pdfFilename,
        content: input.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  await transporter.sendMail(mail);
  return true;
}

export async function sendQuoteEmail(input: SendQuoteEmailInput): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const sent = await sendViaResend(input);
    if (sent) return;
  }

  const sent = await sendViaSmtp(input);
  if (sent) return;

  throw new Error(
    "El envío por correo no está configurado. Agregue RESEND_API_KEY o SMTP_HOST, SMTP_USER y SMTP_PASS en .env.local"
  );
}
