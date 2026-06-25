/**
 * SMTP-Verbindung testen: npx tsx scripts/test-smtp.ts
 */
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.PILOT_NOTIFICATION_EMAIL ?? user;

  if (!host || !user || !pass) {
    console.error("SMTP_HOST, SMTP_USER, SMTP_PASS fehlen in .env.local");
    process.exit(1);
  }

  console.log("Teste SMTP:", { host, port, user, to, passSet: Boolean(pass) });

  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" ? true : secureEnv === "false" ? false : port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: { user, pass },
    tls: { minVersion: "TLSv1.2" },
  });

  try {
    await transporter.verify();
    console.log("✓ SMTP-Verbindung OK");
  } catch (e) {
    console.error("✗ SMTP verify fehlgeschlagen:", e);
    process.exit(1);
  }

  const info = await transporter.sendMail({
    from: process.env.PILOT_EMAIL_FROM ?? user,
    to,
    subject: "TKND NIS2 — SMTP Test",
    text: "Wenn Sie diese Mail sehen, funktioniert der Pilot-E-Mail-Versand.",
  });

  console.log("✓ Test-Mail gesendet:", info.messageId);
  console.log("  Antwort:", info.response);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
