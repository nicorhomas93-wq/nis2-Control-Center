import type { AuditReadinessLevel, AuditReadinessResult } from "@/lib/compliance/types";
import { getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import {
  isWorkComplete,
  resolveObligationStatus,
  normalizeCriticality,
} from "@/lib/compliance/obligations";
import { isPlaceholderValue } from "@/lib/compliance/risk-display";
import { isRiskTreated } from "@/lib/compliance/risk-treatment";
import type { Document, Incident, Measure, Risk } from "@/lib/types";

export const AUDIT_READINESS_LABELS: Record<AuditReadinessLevel, string> = {
  ready: "auditbereit",
  partial: "teilweise auditbereit",
  not_ready: "nicht auditbereit",
};

function levelFromPercent(percent: number): AuditReadinessLevel {
  if (percent >= 85) return "ready";
  if (percent >= 60) return "partial";
  return "not_ready";
}

export function calculateAuditReadiness(
  input: {
    documents: Document[];
    measures: Measure[];
    risks: Risk[];
    incidents: Incident[];
  },
  securityScore?: number
): AuditReadinessResult {
  let score = 100;
  const reasons: string[] = [];

  const missingTypes = getMissingAuditDocumentTypes(input.documents);
  if (missingTypes.length > 0) {
    const deduction = missingTypes.length * 10;
    score -= deduction;
    reasons.push(
      `${missingTypes.length} fehlende${missingTypes.length === 1 ? "s" : ""} Pflichtdokument${missingTypes.length === 1 ? "" : "e"}`
    );
  }

  for (const doc of input.documents) {
    if (!doc.deadline) continue;
    if (new Date(doc.deadline) < new Date()) {
      score -= 8;
      reasons.push(`abgelaufenes Dokument: ${doc.title}`);
    }
  }

  let openMandatoryMeasures = 0;
  let overdueMandatoryMeasures = 0;
  let criticalMandatoryOpen = 0;

  for (const measure of input.measures) {
    if (isWorkComplete(measure.status)) continue;

    const obligation = resolveObligationStatus({
      status: measure.status,
      deadline: measure.deadline,
      criticality: measure.criticality ?? measure.priority,
      isMandatory: measure.is_mandatory,
    });

    if (measure.is_mandatory) {
      openMandatoryMeasures += 1;
      if (obligation === "overdue" || obligation === "critically_overdue") {
        overdueMandatoryMeasures += 1;
        score -= 10;
      } else {
        score -= 5;
      }
    }

    if (
      measure.is_mandatory &&
      normalizeCriticality(measure.criticality ?? measure.priority) === "critical"
    ) {
      criticalMandatoryOpen += 1;
    }
  }

  if (openMandatoryMeasures > 0) {
    reasons.push(
      `${openMandatoryMeasures} offene Pflichtmaßnahme${openMandatoryMeasures === 1 ? "" : "n"}`
    );
  }
  if (overdueMandatoryMeasures > 0) {
    reasons.push(
      `${overdueMandatoryMeasures} überfällige Pflichtmaßnahme${overdueMandatoryMeasures === 1 ? "" : "n"}`
    );
  }
  if (criticalMandatoryOpen > 0) {
    score -= criticalMandatoryOpen * 5;
    reasons.push(
      `${criticalMandatoryOpen} kritische Pflichtmaßnahme${criticalMandatoryOpen === 1 ? "" : "n"} offen`
    );
  }

  let untreatedHighRisks = 0;
  let risksWithoutImpact = 0;
  let risksWithoutResponsible = 0;

  for (const risk of input.risks) {
    if (risk.risk_level === "low" || isRiskTreated(risk, input.measures)) continue;

    untreatedHighRisks += 1;
    if (isPlaceholderValue(risk.measure)) {
      score -= 10;
    }
    if (isPlaceholderValue(risk.business_impact)) {
      risksWithoutImpact += 1;
      score -= 3;
    }
    if (isPlaceholderValue(risk.responsible)) {
      risksWithoutResponsible += 1;
      score -= 3;
    }
  }

  if (untreatedHighRisks > 0) {
    reasons.push(
      `${untreatedHighRisks} unbehandeltes Risiko${untreatedHighRisks === 1 ? "" : "en"}`
    );
  }
  if (risksWithoutImpact > 0) {
    reasons.push(
      `${risksWithoutImpact} Risiko${risksWithoutImpact === 1 ? "" : "en"} ohne Business Impact`
    );
  }
  if (risksWithoutResponsible > 0) {
    reasons.push(
      `${risksWithoutResponsible} Risiko${risksWithoutResponsible === 1 ? "" : "en"} ohne Verantwortlichen`
    );
  }

  for (const incident of input.incidents) {
    if (isWorkComplete(incident.status)) continue;
    score -= 10;
    reasons.push(`Vorfall unvollständig dokumentiert: ${incident.title}`);
  }

  const hasOpenIssues =
    missingTypes.length > 0 ||
    openMandatoryMeasures > 0 ||
    overdueMandatoryMeasures > 0 ||
    criticalMandatoryOpen > 0 ||
    untreatedHighRisks > 0 ||
    risksWithoutImpact > 0 ||
    risksWithoutResponsible > 0 ||
    input.documents.some((d) => d.deadline && new Date(d.deadline) < new Date()) ||
    input.incidents.some((i) => !isWorkComplete(i.status));

  score = Math.max(0, Math.min(100, score));

  if (hasOpenIssues) {
    score = Math.min(score, 99);
  }

  if (securityScore !== undefined && securityScore < 80) {
    score = Math.min(score, 79);
  }

  if (securityScore !== undefined && securityScore < 100 && score >= 100) {
    score = 99;
  }

  const level = levelFromPercent(score);
  const uniqueReasons = [...new Set(reasons)].slice(0, 4);

  let summary: string;
  if (level === "ready" && !hasOpenIssues) {
    summary = "Alle Pflichtnachweise, Risiken und Maßnahmen sind vollständig dokumentiert.";
  } else if (uniqueReasons.length === 0) {
    summary = "Prüfen Sie Audit-Ordner, Maßnahmen und Risikobewertungen.";
  } else {
    summary = `Grund: ${uniqueReasons.join(", ")}.`;
  }

  if (securityScore !== undefined && securityScore < 80 && level === "ready") {
    summary = `Security Score ${securityScore}/100 — Audit-Bereitschaft ist auf „teilweise auditbereit“ begrenzt.`;
  }

  if (missingTypes.length > 0 && uniqueReasons.length < 4) {
    const labels = missingTypes.slice(0, 2).map(getDocumentTypeLabel).join(", ");
    if (!summary.includes(labels)) {
      summary += ` Fehlend u. a.: ${labels}.`;
    }
  }

  return {
    percent: score,
    level,
    label: AUDIT_READINESS_LABELS[level],
    summary,
  };
}
