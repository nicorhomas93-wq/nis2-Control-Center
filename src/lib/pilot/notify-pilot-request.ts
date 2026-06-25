import {
  PILOT_CONTACT_EMAIL,
  PILOT_NOTIFICATION_EMAIL,
} from "@/lib/app-config";
import type { PilotRequestInput } from "@/lib/pilot/pilot-request-store";

export type PilotNotifyResult = {
  sent: boolean;
  method?: string;
  error?: string;
};

function formatEmailBody(payload: PilotRequestInput): string {
  return [
    "Neue Pilotzugang-Anfrage — TKND NIS2 Control Center",
    "",
    `Name: ${payload.name}`,
    `Unternehmen: ${payload.company}`,
    `E-Mail: ${payload.email}`,
    `Telefon: ${payload.phone ?? "—"}`,
    `Branche: ${payload.industry ?? "—"}`,
    "",
    "Nachricht:",
    payload.message?.trim() || "—",
    "",
    `Gesendet: ${new Date().toLocaleString("de-DE")}`,
  ].join("\n");
}

function getSmtpFromAddress(): string {
  const user = process.env.SMTP_USER?.trim() ?? "";
  const configured = process.env.PILOT_EMAIL_FROM?.trim();
  // Microsoft 365: Absender muss dem authentifizierten Konto entsprechen
  return user || configured || PILOT_NOTIFICATION_EMAIL;
}

async function sendViaResend(
  to: string,
  payload: PilotRequestInput
): Promise<PilotNotifyResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false };

  const from =
    process.env.PILOT_EMAIL_FROM?.trim() ??
    "TKND NIS2 Control Center <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: payload.email,
        subject: `Pilotanfrage: ${payload.company} (${payload.name})`,
        text: formatEmailBody(payload),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { sent: false, error: `Resend: ${detail}` };
    }

    return { sent: true, method: "resend" };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Resend unbekannter Fehler",
    };
  }
}

function parseSmtpPass(raw?: string): string {
  return raw?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function buildSmtpTransportOptions(host: string, port: number, user: string, pass: string) {
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" ? true : secureEnv === "false" ? false : port === 465;

  return {
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: { user, pass },
    tls: { minVersion: "TLSv1.2" as const },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  };
}

async function sendViaSmtpHost(
  host: string,
  to: string,
  payload: PilotRequestInput,
  user: string,
  pass: string
): Promise<PilotNotifyResult> {
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const from = getSmtpFromAddress();

  const transporter = nodemailer.createTransport(
    buildSmtpTransportOptions(host, port, user, pass)
  );

  try {
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: payload.email,
      subject: `Pilotanfrage: ${payload.company} (${payload.name})`,
      text: formatEmailBody(payload),
    });
    return { sent: true, method: `smtp:${host}`, error: info.response };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Pilot] SMTP Fehler (${host}):`, message);
    return {
      sent: false,
      method: "smtp",
      error: message,
    };
  }
}

async function sendViaSmtp(
  to: string,
  payload: PilotRequestInput
): Promise<PilotNotifyResult> {
  const primaryHost = process.env.SMTP_HOST?.trim();
  const altHost = process.env.SMTP_HOST_ALT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = parseSmtpPass(process.env.SMTP_PASS);
  if (!primaryHost || !user || !pass) {
    return { sent: false, error: "SMTP nicht konfiguriert (HOST/USER/PASS)" };
  }

  const hosts = [primaryHost, altHost].filter(
    (host, index, list): host is string =>
      Boolean(host) && list.indexOf(host) === index
  );

  let lastError = "SMTP unbekannter Fehler";
  for (const host of hosts) {
    const result = await sendViaSmtpHost(host, to, payload, user, pass);
    if (result.sent) return result;
    if (result.error) lastError = result.error;
  }

  return { sent: false, method: "smtp", error: lastError };
}

async function getMicrosoftGraphToken(): Promise<string | null> {
  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();
  if (!tenantId || !clientId || !clientSecret) return null;

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Graph Token: ${detail}`);
  }

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Wie viele CRMs/Microsoft-365-Integrationen — ohne klassisches SMTP-Login. */
async function sendViaMicrosoftGraph(
  to: string,
  payload: PilotRequestInput
): Promise<PilotNotifyResult> {
  const sendAs =
    process.env.MS_GRAPH_SEND_AS?.trim() ??
    process.env.SMTP_USER?.trim() ??
    PILOT_NOTIFICATION_EMAIL;

  let token: string | null;
  try {
    token = await getMicrosoftGraphToken();
  } catch (error) {
    return {
      sent: false,
      method: "graph",
      error: error instanceof Error ? error.message : String(error),
    };
  }
  if (!token) return { sent: false };

  const fromAddress = getSmtpFromAddress();
  const fromName =
    process.env.PILOT_EMAIL_FROM_NAME?.trim() ?? "TKND NIS2 Control Center";

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sendAs)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: `Pilotanfrage: ${payload.company} (${payload.name})`,
            body: {
              contentType: "Text",
              content: formatEmailBody(payload),
            },
            from: {
              emailAddress: { address: fromAddress, name: fromName },
            },
            toRecipients: [{ emailAddress: { address: to } }],
            replyTo: [{ emailAddress: { address: payload.email } }],
          },
          saveToSentItems: true,
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      return { sent: false, method: "graph", error: `Graph: ${detail}` };
    }

    return { sent: true, method: "graph" };
  } catch (error) {
    return {
      sent: false,
      method: "graph",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Benachrichtigt das Team per E-Mail (Resend, Graph API oder SMTP). */
export async function notifyPilotRequest(
  payload: PilotRequestInput
): Promise<PilotNotifyResult> {
  const to = process.env.PILOT_NOTIFICATION_EMAIL?.trim() ?? PILOT_NOTIFICATION_EMAIL;

  const resend = await sendViaResend(to, payload);
  if (resend.sent) return resend;

  const graph = await sendViaMicrosoftGraph(to, payload);
  if (graph.sent) return graph;

  const smtp = await sendViaSmtp(to, payload);
  if (smtp.sent) return smtp;

  const combinedError = [resend.error, graph.error, smtp.error]
    .filter(Boolean)
    .join(" | ");
  console.warn(`[Pilot] E-Mail nicht versendet an ${to}:`, combinedError || "unbekannt");

  return {
    sent: false,
    error: combinedError || "E-Mail-Versand fehlgeschlagen",
  };
}

export function getPilotEmailUserHint(error?: string): string {
  if (!error) {
    return "Anfrage gespeichert. Die E-Mail-Benachrichtigung konnte nicht gesendet werden.";
  }

  const lower = error.toLowerCase();

  if (
    lower.includes("smtpclientauthentication is disabled") ||
    lower.includes("smtp_auth_disabled")
  ) {
    return [
      "Anfrage gespeichert — klassisches SMTP-Login wird von Microsoft 365 abgelehnt.",
      "",
      "Ihr CRM versendet vermutlich anders (z. B. Microsoft Graph API oder andere SMTP-Daten).",
      "",
      "Schnellste Lösungen:",
      "1. SMTP-Host/Port/User/Passwort aus den CRM-E-Mail-Einstellungen 1:1 in .env.local übernehmen",
      "2. Microsoft Graph (wie viele CRMs): AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env.local",
      "3. Oder: Authenticated SMTP für das Postfach in M365 aktivieren",
      "4. Oder: RESEND_API_KEY als Alternative",
      "",
      "Details: https://aka.ms/smtp_auth_disabled",
    ].join("\n");
  }

  if (lower.includes("authentication unsuccessful") || lower.includes("invalid login")) {
    return [
      "Anfrage gespeichert. SMTP-Anmeldung fehlgeschlagen.",
      "",
      "Bei Strato: SMTP_HOST=smtp.strato.de, SMTP_PORT=465, SMTP_SECURE=true",
      "SMTP_PASS = Strato-Postfach-Passwort (wie im CRM).",
    ].join("\n");
  }

  return "Anfrage gespeichert. E-Mail-Versand fehlgeschlagen — bitte IT-Administration kontaktieren.";
}
