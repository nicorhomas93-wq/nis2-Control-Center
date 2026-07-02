import { PILOT_NOTIFICATION_EMAIL } from "@/lib/app-config";

export type OutboundEmailMethod = "resend" | "graph" | "smtp";

export type OutboundEmailResult = {
  sent: boolean;
  method?: OutboundEmailMethod;
  error?: string;
};

export interface OutboundEmailPayload {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}

function parseSmtpPass(raw?: string): string {
  return raw?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function getFromAddress(): string {
  const user = process.env.SMTP_USER?.trim() ?? "";
  return (
    process.env.PILOT_EMAIL_FROM?.trim() ||
    user ||
    PILOT_NOTIFICATION_EMAIL
  );
}

function getFromName(): string {
  return process.env.PILOT_EMAIL_FROM_NAME?.trim() ?? "TKND NIS2 Control Center";
}

export function hasResendConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function hasGraphConfig(): boolean {
  return Boolean(
    process.env.AZURE_TENANT_ID?.trim() &&
      process.env.AZURE_CLIENT_ID?.trim() &&
      process.env.AZURE_CLIENT_SECRET?.trim()
  );
}

export function hasSmtpConfig(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = parseSmtpPass(process.env.SMTP_PASS);
  return Boolean(host && user && pass);
}

async function sendViaResend(payload: OutboundEmailPayload): Promise<OutboundEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [payload.to],
        reply_to: payload.replyTo,
        subject: payload.subject,
        text: payload.body,
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
    throw new Error(`Graph Token: ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function sendViaGraph(payload: OutboundEmailPayload): Promise<OutboundEmailResult> {
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
            subject: payload.subject,
            body: { contentType: "Text", content: payload.body },
            from: {
              emailAddress: { address: getFromAddress(), name: getFromName() },
            },
            toRecipients: [{ emailAddress: { address: payload.to } }],
            replyTo: payload.replyTo
              ? [{ emailAddress: { address: payload.replyTo } }]
              : undefined,
          },
          saveToSentItems: true,
        }),
      }
    );

    if (!res.ok) {
      return { sent: false, method: "graph", error: `Graph: ${await res.text()}` };
    }

    return { sent: true, method: "graph" };
  } catch (error) {
    return {
      sent: false,
      method: "graph",
      error: error instanceof Error ? error.message : "Graph-Fehler",
    };
  }
}

async function sendViaSmtpHost(
  host: string,
  payload: OutboundEmailPayload,
  user: string,
  pass: string
): Promise<OutboundEmailResult> {
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
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: payload.to,
      replyTo: payload.replyTo ?? PILOT_NOTIFICATION_EMAIL,
      subject: payload.subject,
      text: payload.body,
    });
    return { sent: true, method: "smtp" };
  } catch (error) {
    return {
      sent: false,
      method: "smtp",
      error: error instanceof Error ? error.message : "SMTP-Fehler",
    };
  }
}

async function sendViaSmtp(payload: OutboundEmailPayload): Promise<OutboundEmailResult> {
  const primaryHost = process.env.SMTP_HOST?.trim();
  const altHost = process.env.SMTP_HOST_ALT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = parseSmtpPass(process.env.SMTP_PASS);

  if (!primaryHost || !user || !pass) {
    return { sent: false, error: "SMTP nicht konfiguriert (HOST/USER/PASS)" };
  }

  const hosts = [primaryHost, altHost].filter(
    (host, index, list): host is string => Boolean(host) && list.indexOf(host) === index
  );

  let lastError = "SMTP unbekannter Fehler";
  for (const host of hosts) {
    const result = await sendViaSmtpHost(host, payload, user, pass);
    if (result.sent) return result;
    if (result.error) lastError = result.error;
  }

  return { sent: false, method: "smtp", error: lastError };
}

/** Resend → Microsoft Graph → SMTP (mit Fallback-Host). */
export async function sendOutboundEmail(
  payload: OutboundEmailPayload
): Promise<OutboundEmailResult> {
  if (!hasResendConfig() && !hasGraphConfig() && !hasSmtpConfig()) {
    return {
      sent: false,
      error:
        "E-Mail-Versand nicht eingerichtet (RESEND_API_KEY, Microsoft Graph oder SMTP fehlt)",
    };
  }

  const resend = await sendViaResend(payload);
  if (resend.sent) return resend;

  const graph = await sendViaGraph(payload);
  if (graph.sent) return graph;

  const smtp = await sendViaSmtp(payload);
  if (smtp.sent) return smtp;

  const combinedError = [resend.error, graph.error, smtp.error].filter(Boolean).join(" | ");
  return {
    sent: false,
    error: combinedError || "E-Mail-Versand fehlgeschlagen",
  };
}
