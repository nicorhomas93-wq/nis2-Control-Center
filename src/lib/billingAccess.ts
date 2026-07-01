import type { Company } from "@/lib/types";
import { getPlanLabel, PILOT_PLAN } from "@/lib/plans";

export type BillingFeature =
  | "documents.basic"
  | "documents.all"
  | "audit.export"
  | "risks"
  | "measures"
  | "incidents"
  | "multi_tenant"
  | "white_label";

const FEATURE_MATRIX: Record<string, BillingFeature[]> = {
  free: ["documents.basic"],
  starter: ["documents.basic", "audit.export"],
  business: [
    "documents.all",
    "audit.export",
    "risks",
    "measures",
    "incidents",
  ],
  consultant: [
    "documents.all",
    "audit.export",
    "risks",
    "measures",
    "incidents",
    "multi_tenant",
    "white_label",
  ],
  pilot: [
    "documents.all",
    "audit.export",
    "risks",
    "measures",
    "incidents",
  ],
};

const PAID_ABO_PLANS = ["starter", "business", "consultant"] as const;

function pilotEndsAtDate(company: Company): Date | null {
  if (!company.trial_ends_at) return null;
  const d = new Date(company.trial_ends_at);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Bezahltes Stripe-Abo — nur wenn access_enabled via Webhook gesetzt wurde.
 * Niemals aus Client-Code ableiten.
 */
export function hasActiveAbo(company: Company | null | undefined): boolean {
  if (!company?.access_enabled) return false;
  const plan = company.plan ?? "free";
  return PAID_ABO_PLANS.includes(plan as (typeof PAID_ABO_PLANS)[number]);
}

export function hasPaidSubscription(
  company: Company | null | undefined,
  platformOwner = false
): boolean {
  if (platformOwner) return true;
  return hasActiveAbo(company) || isInPilotPhase(company) || isComplimentaryPilot(company);
}

function effectivePlan(
  company: Company | null | undefined,
  platformOwner = false
): string {
  if (platformOwner) return "consultant";
  if (!company) return "free";

  if (hasActiveAbo(company)) {
    return company.plan ?? "free";
  }

  if (isInPilotPhase(company)) {
    return "pilot";
  }

  if (isComplimentaryPilot(company)) {
    return "pilot";
  }

  return "free";
}

export function canUseFeature(
  company: Company | null | undefined,
  feature: BillingFeature,
  platformOwner = false
): boolean {
  if (platformOwner) return true;
  const plan = effectivePlan(company);
  const allowed = FEATURE_MATRIX[plan] ?? FEATURE_MATRIX.free;
  return allowed.includes(feature);
}

export function getUpgradeHint(feature: BillingFeature): string | null {
  if (feature === "multi_tenant" || feature === "white_label") {
    return "Für diese Funktion ist der Consultant-Plan erforderlich.";
  }
  if (
    feature === "documents.all" ||
    feature === "audit.export" ||
    feature === "risks" ||
    feature === "measures" ||
    feature === "incidents"
  ) {
    return "Für diese Funktion ist der Business-Plan erforderlich.";
  }
  return "Für diese Funktion ist ein kostenpflichtiger Plan erforderlich.";
}

export function isComplimentaryPilot(
  company: Company | null | undefined,
  platformOwner = false
): boolean {
  if (platformOwner) return false;
  if (!company) return false;
  const plan = company.plan ?? "free";
  return plan === "pilot" && !company.pilot_setup_paid_at && !company.access_enabled;
}

/** Pilotphase (499 € einmalig) — nur via Webhook gesetzt, kein Abo-access_enabled. */
export function isInPilotPhase(
  company: Company | null | undefined,
  platformOwner = false
): boolean {
  if (platformOwner) return false;
  if (!company || company.plan !== "pilot" || !company.pilot_setup_paid_at) return false;
  if (hasActiveAbo(company)) return false;

  const end = pilotEndsAtDate(company);
  if (!end) return company.subscription_status === "pilot_active";

  return end.getTime() > Date.now();
}

export function needsToChooseAbo(
  company: Company | null | undefined,
  platformOwner = false
): boolean {
  if (platformOwner) return false;
  if (!company || !company.pilot_setup_paid_at) return false;
  if (hasActiveAbo(company)) return false;
  if (isInPilotPhase(company)) return false;
  return company.plan === "pilot" || Boolean(company.pilot_phase_completed_at);
}

export function hasUsedPilotPackage(company: Company | null | undefined): boolean {
  return Boolean(company?.pilot_setup_paid_at);
}

export function getCompanyPlanLabel(
  company: Company | null | undefined,
  platformOwner = false
): string {
  if (platformOwner) return "Owner (Vollzugang)";
  if (!company) return "Free";
  if (isComplimentaryPilot(company)) return "Pilot (kostenlos)";
  if (isInPilotPhase(company)) return "Pilotphase (einmalig)";
  if (needsToChooseAbo(company)) return "Pilot abgeschlossen";
  if (hasActiveAbo(company)) return getPlanLabel(company.plan);
  if (company.plan === "pilot") return PILOT_PLAN.name;
  return getPlanLabel(company.plan);
}

export function getCompanyStatusLabel(
  company: Company | null | undefined,
  platformOwner = false
): string {
  if (platformOwner) return "Interner Vollzugang";
  if (!company) return "Inaktiv";
  if (isComplimentaryPilot(company)) return "Pilot aktiv (kostenlos)";
  if (isInPilotPhase(company)) return "Pilotphase aktiv";
  if (needsToChooseAbo(company)) return "Abo erforderlich";
  if (hasActiveAbo(company)) {
    const status = company.subscription_status ?? "inactive";
    switch (status) {
      case "active":
        return "Abo aktiv";
      case "trialing":
        return "Testphase";
      default:
        return "Abo aktiv";
    }
  }
  if (company.subscription_status === "past_due") return "Zahlung fehlgeschlagen";
  if (
    company.subscription_status === "canceled" ||
    company.subscription_status === "unpaid" ||
    company.subscription_status === "incomplete" ||
    company.subscription_status === "incomplete_expired"
  ) {
    return "Abo inaktiv";
  }
  return "Inaktiv";
}
