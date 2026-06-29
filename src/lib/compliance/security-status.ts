import { getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import { calculateAuditReadiness } from "@/lib/compliance/audit-readiness";
import {
  daysOverdue,
  isWorkComplete,
  isInProgress,
  normalizeCriticality,
  resolveObligationStatus,
} from "@/lib/compliance/obligations";
import { deriveRiskProblemTitle, isPlaceholderValue } from "@/lib/compliance/risk-display";
import { resolveRiskAsset } from "@/lib/assets/resolve";
import type {
  AuditReadinessResult,
  ScoreDriver,
  SecurityLevel,
  SecurityStatusResult,
} from "@/lib/compliance/types";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";

function securityLevelFromScore(score: number): SecurityLevel {
  if (score >= 80) return "stable";
  if (score >= 50) return "attention";
  return "critical";
}

function severityLabel(level: string): string {
  switch (level) {
    case "critical":
      return "Kritisch";
    case "high":
      return "Hoch";
    case "medium":
      return "Mittel";
    default:
      return "Niedrig";
  }
}

function addDriver(drivers: ScoreDriver[], driver: ScoreDriver): void {
  if (drivers.some((d) => d.id === driver.id)) return;
  drivers.push(driver);
}

function riskOpenImpact(risk: Risk): { impact: number; severity: string } {
  const crit = normalizeCriticality(risk.criticality);
  if (crit === "critical" || risk.risk_level === "high") {
    return { impact: crit === "critical" ? 15 : 10, severity: "Hoch" };
  }
  if (risk.risk_level === "medium") {
    return { impact: 5, severity: "Mittel" };
  }
  return { impact: 0, severity: "Niedrig" };
}

export function calculateSecurityStatus(input: {
  company: Company | null;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  incidents: Incident[];
}): SecurityStatusResult {
  const drivers: ScoreDriver[] = [];
  let score = 100;

  for (const risk of input.risks) {
    if (risk.risk_level === "low") continue;

    const { impact, severity } = riskOpenImpact(risk);
    if (impact <= 0) continue;

    score -= impact;
    const title = deriveRiskProblemTitle(risk);
    addDriver(drivers, {
      id: `risk-open-${risk.id}`,
      title,
      asset: resolveRiskAsset(risk, []).name,
      severity,
      impact,
      recommendation:
        isPlaceholderValue(risk.measure)
          ? "Risikomaßnahme definieren, umsetzen und im Audit-Ordner dokumentieren"
          : risk.measure!,
      category: "risks",
      label: title,
    });

    const obligation = resolveObligationStatus({
      status: "open",
      deadline: risk.deadline,
      criticality: risk.criticality,
      isMandatory: risk.is_mandatory,
    });
    if (obligation === "overdue" || obligation === "critically_overdue") {
      const odImpact = 10;
      score -= odImpact;
      addDriver(drivers, {
        id: `risk-overdue-${risk.id}`,
        title: `Risikomaßnahme überfällig: ${title}`,
        asset: risk.asset,
        severity: "Hoch",
        impact: odImpact,
        recommendation: "Frist einhalten oder Maßnahme abschließen und Nachweis hinterlegen",
        category: "obligations",
        label: `Risikomaßnahme überfällig: ${title}`,
      });
    }
  }

  for (const measure of input.measures) {
    if (isWorkComplete(measure.status)) continue;

    const obligation = resolveObligationStatus({
      status: measure.status,
      deadline: measure.deadline,
      criticality: measure.criticality ?? measure.priority,
      isMandatory: measure.is_mandatory,
    });

    if (obligation === "overdue" || obligation === "critically_overdue") {
      const impact = 10;
      score -= impact;
      const days = daysOverdue(measure.deadline);
      addDriver(drivers, {
        id: `measure-overdue-${measure.id}`,
        title: `Überfällige Maßnahme: ${measure.title}`,
        asset: measure.responsible ?? "Organisation",
        severity: obligation === "critically_overdue" ? "Kritisch" : "Hoch",
        impact,
        recommendation: `Maßnahme umsetzen${days > 0 ? ` — ${days} Tage überfällig` : ""}`,
        category: "measures",
        label: `Überfällige Maßnahme: ${measure.title}`,
      });
    } else if (normalizeCriticality(measure.criticality ?? measure.priority) === "critical") {
      const impact = 7;
      score -= impact;
      addDriver(drivers, {
        id: `measure-crit-${measure.id}`,
        title: measure.title,
        asset: measure.responsible ?? "Organisation",
        severity: "Hoch",
        impact,
        recommendation: measure.target_state ?? "Kritische Maßnahme priorisiert abschließen",
        category: "measures",
        label: measure.title,
      });
    }
  }

  for (const incident of input.incidents) {
    if (isWorkComplete(incident.status)) continue;

    if (incident.status === "open") {
      const impact = 15;
      score -= impact;
      addDriver(drivers, {
        id: `incident-open-${incident.id}`,
        title: `Offener Sicherheitsvorfall: ${incident.title}`,
        asset: incident.responsible ?? "Incident-Response",
        severity: "Kritisch",
        impact,
        recommendation: "Vorfall dokumentieren, bewerten und Meldepflicht prüfen",
        category: "incidents",
        label: `Offener Vorfall: ${incident.title}`,
      });
    } else if (isInProgress(incident.status)) {
      const impact = 10;
      score -= impact;
      addDriver(drivers, {
        id: `incident-progress-${incident.id}`,
        title: `Unvollständiger Vorfall-Workflow: ${incident.title}`,
        asset: incident.responsible ?? "Incident-Response",
        severity: "Hoch",
        impact,
        recommendation: "Dokumentation vervollständigen und Abschluss im System markieren",
        category: "incidents",
        label: `Vorfall in Bearbeitung: ${incident.title}`,
      });
    }
  }

  const missingTypes = getMissingAuditDocumentTypes(input.documents);
  for (const docType of missingTypes) {
    const impact = 5;
    score -= impact;
    addDriver(drivers, {
      id: `doc-missing-${docType}`,
      title: `Fehlender Nachweis: ${getDocumentTypeLabel(docType)}`,
      asset: "Audit-Ordner",
      severity: "Hoch",
      impact,
      recommendation: `Dokument „${getDocumentTypeLabel(docType)}“ erstellen und im Audit-Ordner ablegen`,
      category: "documents",
      label: `Fehlender Nachweis: ${getDocumentTypeLabel(docType)}`,
    });
  }

  for (const doc of input.documents) {
    if (!doc.deadline) continue;
    if (new Date(doc.deadline) < new Date()) {
      const impact = 8;
      score -= impact;
      addDriver(drivers, {
        id: `doc-exp-${doc.id}`,
        title: `Abgelaufenes Dokument: ${doc.title}`,
        asset: doc.title,
        severity: "Hoch",
        impact,
        recommendation: "Dokument überarbeiten, freigeben und neues Gültigkeitsdatum setzen",
        category: "documents",
        label: `Abgelaufenes Dokument: ${doc.title}`,
      });
    }
  }

  if (!input.company?.nis2_status || input.company.nis2_status === "unbekannt") {
    score -= 5;
    addDriver(drivers, {
      id: "assessment-missing",
      title: "Betroffenheitscheck nicht abgeschlossen",
      asset: "Unternehmen",
      severity: "Mittel",
      impact: 5,
      recommendation: "NIS2-Betroffenheit prüfen und Ergebnis dokumentieren",
      category: "assessment",
      label: "Betroffenheitscheck nicht abgeschlossen",
    });
  }

  score = Math.max(0, Math.min(100, score));
  const level = securityLevelFromScore(score);
  drivers.sort((a, b) => b.impact - a.impact);

  const auditReadiness = calculateAuditReadiness(input);
  const summary = buildSummary(level, drivers, score);

  return {
    score,
    level,
    summary,
    drivers: drivers.slice(0, 20),
    auditReadiness,
    auditReadinessPercent: auditReadiness.percent,
  };
}

function buildSummary(
  level: SecurityLevel,
  drivers: ScoreDriver[],
  score: number
): string {
  if (level === "stable") {
    return `Ihr Sicherheitsstatus ist stabil (${score}/100). Pflegen Sie Nachweise und Maßnahmen planmäßig.`;
  }

  const top = drivers[0];
  if (!top) {
    return `Aktueller Score: ${score}/100 — Handlungsbedarf in Risiken, Maßnahmen oder Nachweisen.`;
  }

  const prefix =
    level === "critical"
      ? "Kritischer Sicherheitsstatus"
      : "Erhöhter Handlungsbedarf";

  return `${prefix} (${score}/100): ${top.title}. Empfehlung: ${top.recommendation}`;
}

export function securityLevelBadgeClass(level: SecurityLevel): string {
  switch (level) {
    case "stable":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "attention":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
  }
}

export function securityLevelBarClass(level: SecurityLevel): string {
  switch (level) {
    case "stable":
      return "bg-emerald-500";
    case "attention":
      return "bg-amber-500";
    case "critical":
      return "bg-red-500";
  }
}

export { severityLabel };
