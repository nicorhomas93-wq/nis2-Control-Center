import {
  hasGraphConfig,
  hasResendConfig,
  hasSmtpConfig,
  type OutboundEmailMethod,
} from "@/lib/email/outbound";

export const JARVIS_EMAIL_NOT_CONFIGURED = "E-Mail-Versand nicht eingerichtet";

export type JarvisEmailProvider = OutboundEmailMethod;

export interface JarvisEmailConfig {
  configured: boolean;
  provider: JarvisEmailProvider | null;
  providers: JarvisEmailProvider[];
  label: string;
  hint?: string;
}

export function getJarvisEmailConfig(): JarvisEmailConfig {
  const providers: JarvisEmailProvider[] = [];
  const labels: string[] = [];

  if (hasResendConfig()) {
    providers.push("resend");
    labels.push("Resend API");
  }
  if (hasGraphConfig()) {
    providers.push("graph");
    labels.push("Microsoft Graph");
  }
  if (hasSmtpConfig()) {
    providers.push("smtp");
    const host = process.env.SMTP_HOST?.trim();
    labels.push(host ? `SMTP (${host})` : "SMTP");
  }

  if (providers.length === 0) {
    return {
      configured: false,
      provider: null,
      providers: [],
      label: JARVIS_EMAIL_NOT_CONFIGURED,
      hint:
        "In Vercel oder .env.local setzen: RESEND_API_KEY, oder SMTP_HOST/SMTP_USER/SMTP_PASS, oder AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET.",
    };
  }

  return {
    configured: true,
    provider: providers[0] ?? null,
    providers,
    label: labels.join(" → "),
  };
}
