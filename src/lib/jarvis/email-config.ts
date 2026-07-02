export const JARVIS_EMAIL_NOT_CONFIGURED = "E-Mail-Versand nicht eingerichtet";

export type JarvisEmailProvider = "resend" | "smtp";

export interface JarvisEmailConfig {
  configured: boolean;
  provider: JarvisEmailProvider | null;
  label: string;
}

function parseSmtpPass(raw?: string): string {
  return raw?.trim().replace(/^["']|["']$/g, "") ?? "";
}

export function getJarvisEmailConfig(): JarvisEmailConfig {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    return {
      configured: true,
      provider: "resend",
      label: "Resend API",
    };
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = parseSmtpPass(process.env.SMTP_PASS);

  if (host && user && pass) {
    return {
      configured: true,
      provider: "smtp",
      label: `SMTP (${host})`,
    };
  }

  return {
    configured: false,
    provider: null,
    label: JARVIS_EMAIL_NOT_CONFIGURED,
  };
}
