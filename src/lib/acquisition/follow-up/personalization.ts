import type { FunnelCheckResult } from "@/lib/funnel/types";

export interface PersonalizationVars {
  greeting: string;
  result_label: string;
  result_summary: string;
  problem_frame: string;
  risk_level: string;
  betroffenheit: string;
  company_name: string;
  industry: string;
  cta_primary: string;
  cta_url: string;
  upgrade_url: string;
  result_url: string;
  check_url: string;
  pilot_url: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nis2-control-center.vercel.app";

function riskLevelFromResult(result: FunnelCheckResult): string {
  if (result.level === "high") return "hoch";
  if (result.level === "partial") return "mittel";
  return "niedrig";
}

function betroffenheitFromResult(result: FunnelCheckResult): string {
  if (result.level === "high") return "Sie sind voraussichtlich betroffen";
  if (result.level === "partial") return "Eine Betroffenheit ist möglich";
  return "Die unmittelbare Betroffenheit erscheint geringer";
}

export function buildPersonalizationVars(
  funnelResult: FunnelCheckResult,
  options: { companyName?: string; email?: string; trackUrl?: (path: string) => string } = {}
): PersonalizationVars {
  const track = options.trackUrl ?? ((path: string) => `${APP_URL}${path}`);
  const strong = funnelResult.score >= 60;

  return {
    greeting: options.email ? "Guten Tag," : "Guten Tag,",
    result_label: funnelResult.label,
    result_summary: funnelResult.summary,
    problem_frame: funnelResult.problemFrame,
    risk_level: riskLevelFromResult(funnelResult),
    betroffenheit: betroffenheitFromResult(funnelResult),
    company_name: options.companyName ?? "Ihr Unternehmen",
    industry: funnelResult.answers.industry,
    cta_primary: strong ? "Pilot starten — 499 € einmalig" : "Jetzt NIS2-Status aufbauen",
    cta_url: track(strong ? "/upgrade?offer=pilot" : "/upgrade"),
    upgrade_url: track("/upgrade"),
    result_url: track("/result"),
    check_url: track("/check"),
    pilot_url: track("/upgrade?offer=pilot"),
  };
}

export function applyPersonalization(
  template: string,
  vars: PersonalizationVars
): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );
}
