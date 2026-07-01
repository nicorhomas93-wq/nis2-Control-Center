import { PILOT_NOTIFICATION_EMAIL } from "@/lib/app-config";

export type SendEmailResult = {
  sent: boolean;
  method?: "resend" | "smtp";
  error?: string;
};

function parseSmtpPass(raw?: string): string {
  return raw?.trim().replace(/^["']|["']$/g, "") ?? "";
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress =
    options.from?.trim() ||
    process.env.PILOT_EMAIL_FROM?.trim() ||
    "TKND NIS2 Control Center <onboarding@resend.dev>";

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [options.to],
          reply_to: options.replyTo,
          subject: options.subject,
          text: options.body,
          html: options.html,
        }),
      });

      if (!res.ok) {
        return { sent: false, error: `Resend: ${await res.text()}` };
      }

      return { sent: true, method: "resend" };
    } catch (error) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : "Resend-Fehler",
      };
    }
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = parseSmtpPass(process.env.SMTP_PASS);
  if (!host || !user || !pass) {
    return {
      sent: false,
      error: "E-Mail-Versand nicht konfiguriert (RESEND_API_KEY oder SMTP fehlt)",
    };
  }

  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
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
    await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      replyTo: options.replyTo ?? PILOT_NOTIFICATION_EMAIL,
      subject: options.subject,
      text: options.body,
      html: options.html,
    });
    return { sent: true, method: "smtp" };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "SMTP-Fehler",
    };
  }
}
