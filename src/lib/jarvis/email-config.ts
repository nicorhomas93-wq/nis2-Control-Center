import {
  getOutboundEmailConfig,
  type OutboundEmailMethod,
} from "@/lib/email/outbound";

export const JARVIS_EMAIL_NOT_CONFIGURED = "E-Mail-Versand nicht eingerichtet";

export type JarvisEmailProvider = OutboundEmailMethod;

export interface JarvisEmailConfig {
  configured: boolean;
  provider: JarvisEmailProvider | null;
  providers: JarvisEmailProvider[];
  label: string;
  sharedWith: string;
}

/** Jarvis nutzt dieselbe zentrale Mail-Konfiguration wie Pilotanfragen & Einladungen. */
export function getJarvisEmailConfig(): JarvisEmailConfig {
  const base = getOutboundEmailConfig();
  return {
    ...base,
    sharedWith: "Pilotanfragen, Team-Einladungen, Jarvis",
  };
}
