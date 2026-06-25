import type { Company } from "@/lib/types";

export type BillingFeature =
  | "documents.basic"
  | "documents.all"
  | "audit.export"
  | "risks"
  | "measures"
  | "incidents"
  | "jarvis.sales"
  | "jarvis.traffic"
  | "multi_tenant";

const FEATURE_MATRIX: Record<string, BillingFeature[]> = {
  free: ["documents.basic"],
  starter: ["documents.basic", "audit.export"],
  business: [
    "documents.all",
    "audit.export",
    "risks",
    "measures",
    "incidents",
    "jarvis.sales",
  ],
  consultant: [
    "documents.all",
    "audit.export",
    "risks",
    "measures",
    "incidents",
    "jarvis.sales",
    "jarvis.traffic",
    "multi_tenant",
  ],
  pilot: [
    "documents.all",
    "audit.export",
    "risks",
    "measures",
    "incidents",
    "jarvis.sales",
    "jarvis.traffic",
  ],
};

function effectivePlan(company: Company | null | undefined): string {
  if (!company) return "free";
  const status = company.subscription_status ?? "inactive";
  const plan = company.plan ?? "free";

  if (status === "active" || status === "trialing" || status === "past_due") {
    return plan;
  }

  if (plan === "pilot" && !company.subscription_status) {
    return "pilot";
  }

  if (plan !== "free" && plan !== "pilot" && status === "inactive") {
    return "free";
  }

  return plan === "pilot" ? "pilot" : "free";
}

export function canUseFeature(
  company: Company | null | undefined,
  feature: BillingFeature
): boolean {
  const plan = effectivePlan(company);
  const allowed = FEATURE_MATRIX[plan] ?? FEATURE_MATRIX.free;
  return allowed.includes(feature);
}

export function getUpgradeHint(feature: BillingFeature): string | null {
  if (feature.startsWith("jarvis.")) {
    return "Jarvis Sales und Traffic Jarvis sind im Business-, Pilot- oder Consultant-Plan enthalten.";
  }
  if (feature === "multi_tenant") {
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

export function hasPaidSubscription(company: Company | null | undefined): boolean {
  const status = company?.subscription_status;
  return status === "active" || status === "trialing" || status === "past_due";
}

export function needsUpgradeForJarvis(company: Company | null | undefined): boolean {
  return !canUseFeature(company, "jarvis.sales");
}

export function isComplimentaryPilot(company: Company | null | undefined): boolean {
  if (!company) return false;
  const plan = company.plan ?? "free";
  const status = company.subscription_status ?? "inactive";
  return plan === "pilot" && !["active", "trialing", "past_due"].includes(status);
}
