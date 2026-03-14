import "server-only";

import crypto from "crypto";
import nodemailer from "nodemailer";

export type OtpScope = "manager" | "super_admin";

const TEMP_OTP_BYPASS_EMAILS = new Set(["juju0067@outlook.fr"]);

export function normalizeOtpScope(value: unknown): OtpScope | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "manager" || normalized === "super_admin") return normalized;
  return null;
}

export function hashOtpCode(code: string) {
  return crypto.createHash("sha256").update(String(code || "").trim()).digest("hex");
}

export function generateOtpCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function isOtpBypassEmail(email: unknown) {
  return TEMP_OTP_BYPASS_EMAILS.has(String(email || "").trim().toLowerCase());
}

export function resolveOtpSessionId(accessToken: string, userId: string) {
  const token = String(accessToken || "").trim();
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) return String(userId || "").trim();
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
    return String(payload.session_id || payload.jti || payload.sub || userId || "").trim();
  } catch {
    return String(userId || "").trim();
  }
}

function resolveOtpMailerConfig() {
  const user = String(process.env.EMAIL_USER || "").trim().toLowerCase();
  const pass = String(process.env.EMAIL_APP_PASSWORD || "")
    .replace(/\s+/g, "")
    .trim();
  if (!user || !pass) {
    throw new Error("SMTP OTP non configuré. Définissez EMAIL_USER et EMAIL_APP_PASSWORD dans .env.local.");
  }
  return { user, pass };
}

export async function sendDashboardOtpEmail(params: {
  to: string;
  code: string;
  scope: OtpScope;
}) {
  const { user, pass } = resolveOtpMailerConfig();
  const to = String(params.to || "").trim().toLowerCase();
  const code = String(params.code || "").trim();
  const scopeLabel = params.scope === "super_admin" ? "Super Admin" : "Manager";

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    tls: {
      rejectUnauthorized: false,
    },
    auth: {
      user,
      pass,
    },
  });

  await transporter.verify();

  await transporter.sendMail({
    from: user,
    to,
    subject: `Code de verification ${scopeLabel}`,
    text: `Votre code de verification ${scopeLabel} est ${code}. Il expire dans 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <h1 style="font-size:22px;margin:0 0 16px">Verification ${scopeLabel}</h1>
        <p style="margin:0 0 12px">Votre code de verification est :</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:6px;margin:12px 0 18px">${code}</div>
        <p style="margin:0;color:#444">Ce code expire dans 10 minutes.</p>
      </div>
    `,
  });
}
