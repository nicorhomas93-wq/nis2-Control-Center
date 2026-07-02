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
import { isRiskTreated, riskOpenImpact } from "@/lib/compliance/risk-treatment";
import { resolveRiskAsset } from "@/lib/assets/resolve";
import type {
  AuditReadinessResult,
  ScoreDriver,
  SecurityLevel,
  SecurityStatusResult,
} from "@/lib/compliance/types";
import { applyTaskScoreImpact } from "@/lib/compliance/task-score-impact";
import type { TaskItem } from "@/lib/tasks/types";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";
import type { VendorWithDetails } from "@/lib/vendors/types";
import type { ComplianceEvidenceEntryWithFiles } from "@/lib/compliance-evidence/types";
import { deriveEntryStatus } from "@/lib/compliance-evidence/scoring";
import {
  isEntryMandatoryForCompany,
  isNis2StatusUnknown,
} from "@/lib/compliance-evidence/types";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";

function securityLevelFromScore(score: number): SecurityLevel {
  if (score >= 80) return "stable";
  if (score >= 50) return "attention";
  return "critical";
}

function addDriver(drivers: ScoreDriver[], driver: ScoreDriver): void {
  if (drivers.some((d) => d.id === driver.id)) return;
  drivers.push(driver);
}

export function calculateSecurityStatus(input: {
  company: Company | null;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  incidents: Incident[];
  tasks?: TaskItem[];
  vendors?: VendorWithDetails[];
  complianceEvidence?: ComplianceEvidenceEntryWithFiles[];
}): SecurityStatusResult {
  const drivers: ScoreDriver[] = [];
  let score = 100;

  for (const risk of input.risks) {
    const openImpact = riskOpenImpact(risk, input.measures);
    if (!openImpact) continue;

    const { impact, severity } = openImpact;
    score -= impact;
    const title = deriveRiskProblemTitle(risk);
    addDriver(drivers, {
      id: `risk-open-${risk.id}`,
      title,
      asset: resolveRiskAsset(risk, []).name,
      severity,
      impact,
      recommendation: isPlaceholderValue(risk.measure)
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

    const crit = normalizeCriticality(measure.criticality ?? measure.priority);
    const isHigh =
      crit === "high" || crit === "critical" || measure.priority === "high";

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
    } else if (isHigh) {
      const impact = 7;
      score -= impact;
      addDriver(drivers, {
        id: `measure-high-${measure.id}`,
        title: measure.title,
        asset: measure.responsible ?? "Organisation",
        severity: "Hoch",
        impact,
        recommendation: measure.target_state ?? "Maßnahme priorisiert abschließen",
        category: "measures",
        label: measure.title,
      });
    } else if (measure.is_mandatory) {
      const impact = 5;
      score -= impact;
      addDriver(drivers, {
        id: `measure-mandatory-${measure.id}`,
        title: `Offene Pflichtmaßnahme: ${measure.title}`,
        asset: measure.responsible ?? "Organisation",
        severity: "Mittel",
        impact,
        recommendation: measure.target_state ?? "Pflichtmaßnahme abschließen und dokumentieren",
        category: "measures",
        label: `Offene Pflichtmaßnahme: ${measure.title}`,
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
      const impact =
        incident.status === "documentation_open" ? 12 : incident.status === "waiting_feedback" ? 8 : 10;
      score -= impact;
      addDriver(drivers, {
        id: `incident-progress-${incident.id}`,
        title: `Unvollständiger Vorfall-Workflow: ${incident.title}`,
        asset: incident.responsible ?? "Incident-Response",
        severity: incident.status === "documentation_open" ? "Kritisch" : "Hoch",
        impact,
        recommendation:
          incident.status === "documentation_open"
            ? "Dokumentation und Nachweise vervollständigen"
            : "Dokumentation vervollständigen und Abschluss im System markieren",
        category: "incidents",
        label: `Vorfall in Bearbeitung: ${incident.title}`,
      });
    }
  }

  const missingTypes = getMissingAuditDocumentTypes(
    input.documents,
    input.company ?? null
  );
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

  if (input.tasks?.length) {
    score = applyTaskScoreImpact(score, input.tasks, (driver) => addDriver(drivers, driver));
  }

  if (input.complianceEvidence?.length && input.company) {
    for (const entry of input.complianceEvidence) {
      if (!isEntryMandatoryForCompany(entry, input.company)) continue;
      const status = deriveEntryStatus(entry, entry.files, input.company);
      if (
        status === "nachweis_fehlt" ||
        status === "unvollstaendig" ||
        status === "abgelaufen"
      ) {
        const impact = status === "abgelaufen" ? 6 : 4;
        score -= impact;
        addDriver(drivers, {
          id: `compliance-evidence-${entry.id}`,
          title: `Nachweis fehlt oder abgelaufen: ${entry.title}`,
          asset: "Schulungen & Nachweise",
          severity: status === "abgelaufen" ? "Hoch" : "Mittel",
          impact,
          recommendation: `Nachweis im Modul Schulungen & Nachweise hochladen: ${entry.title}`,
          category: "documents",
          label: entry.title,
        });
      }
    }
  }

  if (isNis2StatusUnknown(input.company?.nis2_status)) {
    score -= 3;
    addDriver(drivers, {
      id: "nis2-status-unknown",
      title: "NIS2-Betroffenheit nicht geklärt",
      asset: "Betroffenheitscheck",
      severity: "Mittel",
      impact: 3,
      recommendation: "Betroffenheitscheck durchführen, um Pflichtlogik für Nachweise zu klären",
      category: "documents",
      label: "NIS2-Status unklar",
    });
  }

  score = Math.max(0, Math.min(100, score));
  drivers.sort((a, b) => b.impact - a.impact);

  const activeDrivers = drivers.filter((d) => d.impact > 0);
  if (activeDrivers.length > 0 && score >= 100) {
    score = 99;
  }
  if (activeDrivers.length === 0) {
    score = 100;
  }

  const auditReadiness = calculateAuditReadiness(input, score);
  const finalLevel = securityLevelFromScore(score);
  const summary = buildSummary(finalLevel, activeDrivers, score);

  return {
    score,
    level: finalLevel,
    summary,
    drivers: activeDrivers.slice(0, 20),
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

export function severityLabel(level: string): string {
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
