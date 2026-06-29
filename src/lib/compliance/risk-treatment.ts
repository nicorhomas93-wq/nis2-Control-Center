import { isWorkComplete, normalizeCriticality } from "@/lib/compliance/obligations";
import { isPlaceholderValue } from "@/lib/compliance/risk-display";
import type { Measure, Risk } from "@/lib/types";

export type RiskTreatmentStatus = "open" | "treated" | "reduced";

export const RISK_TREATMENT_LABELS: Record<RiskTreatmentStatus, string> = {
  open: "Offen",
  treated: "Behandelt",
  reduced: "Reduziert",
};

export function getLinkedMeasures(riskId: string, measures: Measure[]): Measure[] {
  return measures.filter((m) => m.risk_id === riskId);
}

export function isRiskTreated(risk: Risk, measures: Measure[]): boolean {
  if (risk.treatment_status === "treated" || risk.treatment_status === "reduced") {
    return true;
  }
  if (risk.risk_level === "low") return true;

  const linked = getLinkedMeasures(risk.id, measures);
  if (linked.length === 0) return false;

  const mandatory = linked.filter((m) => m.is_mandatory);
  if (mandatory.length > 0) {
    return mandatory.every((m) => isWorkComplete(m.status));
  }

  return (
    linked.some((m) => isWorkComplete(m.status)) &&
    !isPlaceholderValue(risk.measure)
  );
}

export function riskOpenImpact(
  risk: Risk,
  measures: Measure[]
): { impact: number; severity: string } | null {
  if (isRiskTreated(risk, measures)) return null;

  const crit = normalizeCriticality(risk.criticality);
  if (crit === "critical") {
    return { impact: 15, severity: "Kritisch" };
  }
  if (risk.risk_level === "high") {
    return { impact: 10, severity: "Hoch" };
  }
  if (risk.risk_level === "medium") {
    return { impact: 5, severity: "Mittel" };
  }
  return null;
}

export function resolveRiskTreatmentStatus(
  risk: Risk,
  measures: Measure[]
): RiskTreatmentStatus {
  if (!isRiskTreated(risk, measures)) return "open";

  const crit = normalizeCriticality(risk.criticality);
  if (risk.risk_level === "high" || crit === "critical") {
    return "reduced";
  }
  return "treated";
}
