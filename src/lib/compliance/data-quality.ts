import type { Company, Document, Measure, Risk } from "@/lib/types";
import { isPlaceholderValue, deriveRiskProblemTitle } from "@/lib/compliance/risk-display";
import { isWorkComplete } from "@/lib/compliance/obligations";
import type { TaskItem } from "@/lib/tasks/types";
import { isTaskOpen } from "@/lib/tasks/types";

export type DataQualityStatus =
  | "confirmed_with_evidence"
  | "confirmed"
  | "missing"
  | "contradictory";

export interface DataQualityCheck {
  checkKey: string;
  status: DataQualityStatus;
  qualityLevel: "high" | "medium" | "low" | "critical";
  reason: string;
  relatedType?: string;
  relatedId?: string;
}

export interface DataQualityResult {
  percent: number;
  checks: DataQualityCheck[];
  hints: string[];
  auditReadinessCap: number | null;
}

function statusWeight(status: DataQualityStatus): number {
  switch (status) {
    case "confirmed_with_evidence":
      return 100;
    case "confirmed":
      return 70;
    case "missing":
      return 20;
    case "contradictory":
      return 0;
  }
}

export function calculateDataQuality(input: {
  company: Company | null;
  risks: Risk[];
  measures: Measure[];
  documents: Document[];
  tasks?: TaskItem[];
}): DataQualityResult {
  const checks: DataQualityCheck[] = [];
  const hints: string[] = [];

  if (!input.company?.company_name || !input.company.industry) {
    checks.push({
      checkKey: "company_profile",
      status: "missing",
      qualityLevel: "low",
      reason: "Unternehmensprofil unvollständig",
      relatedType: "company",
    });
  } else {
    checks.push({
      checkKey: "company_profile",
      status: "confirmed",
      qualityLevel: "medium",
      reason: "Unternehmensprofil vorhanden",
      relatedType: "company",
    });
  }

  if (!input.company?.nis2_status || input.company.nis2_status === "unbekannt") {
    checks.push({
      checkKey: "nis2_assessment",
      status: "missing",
      qualityLevel: "low",
      reason: "Betroffenheitscheck fehlt",
    });
  } else {
    checks.push({
      checkKey: "nis2_assessment",
      status: "confirmed",
      qualityLevel: "medium",
      reason: "Betroffenheitscheck durchgeführt",
    });
  }

  let unconfirmedRisks = 0;
  let contradictory = 0;
  for (const risk of input.risks) {
    if (isPlaceholderValue(risk.business_impact) || isPlaceholderValue(risk.responsible)) {
      unconfirmedRisks += 1;
      checks.push({
        checkKey: `risk-${risk.id}`,
        status: "missing",
        qualityLevel: "low",
        reason: `Risiko „${deriveRiskProblemTitle(risk)}" unvollständig`,
        relatedType: "risk",
        relatedId: risk.id,
      });
    }
    if (
      risk.risk_level === "low" &&
      (risk.criticality === "high" || risk.criticality === "critical")
    ) {
      contradictory += 1;
      checks.push({
        checkKey: `risk-contradiction-${risk.id}`,
        status: "contradictory",
        qualityLevel: "critical",
        reason: `Widersprüchliche Bewertung bei „${deriveRiskProblemTitle(risk)}"`,
        relatedType: "risk",
        relatedId: risk.id,
      });
    }
  }

  let missingEvidenceMeasures = 0;
  for (const measure of input.measures) {
    if (measure.is_mandatory && !isWorkComplete(measure.status)) {
      missingEvidenceMeasures += 1;
    }
  }

  const openEvidenceTasks =
    input.tasks?.filter(
      (t) => t.evidence_required && isTaskOpen(t.status) && t.status === "waiting_evidence"
    ).length ?? 0;

  if (unconfirmedRisks > 0) {
    hints.push(
      `Bewertung basiert auf ${unconfirmedRisks} unbestätigten Angabe${unconfirmedRisks === 1 ? "" : "n"}.`
    );
  }
  if (missingEvidenceMeasures + openEvidenceTasks > 0) {
    const n = missingEvidenceMeasures + openEvidenceTasks;
    hints.push(`${n} wichtige Nachweis${n === 1 ? "" : "e"} fehlen.`);
  }
  if (contradictory > 0) {
    hints.push(
      `${contradictory} Angabe${contradictory === 1 ? "" : "n"} ${contradictory === 1 ? "ist" : "sind"} widersprüchlich.`
    );
  }

  if (checks.length === 0) {
    return { percent: 100, checks, hints, auditReadinessCap: null };
  }

  const sum = checks.reduce((acc, c) => acc + statusWeight(c.status), 0);
  const percent = Math.round(sum / checks.length);

  let auditReadinessCap: number | null = null;
  if (percent < 50) auditReadinessCap = 60;
  else if (percent < 70) auditReadinessCap = 80;

  return { percent, checks, hints, auditReadinessCap };
}

export function applyDataQualityCap(auditPercent: number, dataQuality: DataQualityResult): number {
  if (dataQuality.auditReadinessCap === null) return auditPercent;
  return Math.min(auditPercent, dataQuality.auditReadinessCap);
}
