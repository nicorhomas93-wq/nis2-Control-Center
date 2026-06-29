import { calculateAuditFolderScore, getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import {
  daysOverdue,
  isWorkComplete,
  normalizeCriticality,
  resolveObligationStatus,
} from "@/lib/compliance/obligations";
import type {
  ScoreDriver,
  SecurityLevel,
  SecurityStatusResult,
} from "@/lib/compliance/types";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";

function securityLevelFromScore(score: number): SecurityLevel {
  if (score >= 80) return "stable";
  if (score >= 50) return "attention";
  return "critical";
}

function addDriver(
  drivers: ScoreDriver[],
  driver: ScoreDriver
): void {
  drivers.push(driver);
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

  const audit = calculateAuditFolderScore(input.documents);
  const missingTypes = getMissingAuditDocumentTypes(input.documents);

  for (const risk of input.risks) {
    if (isWorkComplete(risk.risk_level)) continue;
    const level = risk.risk_level;
    if (level === "high") {
      const impact = 12;
      score -= impact;
      addDriver(drivers, {
        id: `risk-${risk.id}`,
        label: `Kritisches Risiko: ${risk.asset}`,
        impact,
        category: "risks",
      });
    } else if (level === "medium") {
      const impact = 5;
      score -= impact;
      addDriver(drivers, {
        id: `risk-${risk.id}`,
        label: `Risiko: ${risk.asset}`,
        impact,
        category: "risks",
      });
    }

    const obligation = resolveObligationStatus({
      status: risk.risk_level === "low" ? "completed" : "open",
      deadline: risk.deadline,
      criticality: risk.criticality,
      isMandatory: risk.is_mandatory,
    });
    if (obligation === "overdue" || obligation === "critically_overdue") {
      const impact = obligation === "critically_overdue" ? 15 : 8;
      score -= impact;
      addDriver(drivers, {
        id: `risk-od-${risk.id}`,
        label: `Überfälliges Risiko: ${risk.asset}`,
        impact,
        category: "obligations",
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
      const impact = obligation === "critically_overdue" ? 14 : 10;
      score -= impact;
      const days = daysOverdue(measure.deadline);
      addDriver(drivers, {
        id: `measure-${measure.id}`,
        label: `Überfällige Maßnahme: ${measure.title}${days > 0 ? ` (${days} T.)` : ""}`,
        impact,
        category: "measures",
      });
    } else if (normalizeCriticality(measure.criticality ?? measure.priority) === "critical") {
      const impact = 8;
      score -= impact;
      addDriver(drivers, {
        id: `measure-crit-${measure.id}`,
        label: `Kritische Maßnahme offen: ${measure.title}`,
        impact,
        category: "measures",
      });
    } else if (measure.is_mandatory) {
      const impact = 5;
      score -= impact;
      addDriver(drivers, {
        id: `measure-man-${measure.id}`,
        label: `Pflichtmaßnahme offen: ${measure.title}`,
        impact,
        category: "obligations",
      });
    }
  }

  for (const incident of input.incidents) {
    if (isWorkComplete(incident.status)) continue;
    const impact = incident.status === "investigating" ? 8 : 12;
    score -= impact;
    addDriver(drivers, {
      id: `incident-${incident.id}`,
      label: `Offener Vorfall: ${incident.title}`,
      impact,
      category: "incidents",
    });

    const obligation = resolveObligationStatus({
      status: incident.status,
      deadline: incident.deadline,
      criticality: incident.criticality,
      isMandatory: incident.is_mandatory,
    });
    if (obligation === "overdue" || obligation === "critically_overdue") {
      score -= 10;
      addDriver(drivers, {
        id: `incident-od-${incident.id}`,
        label: `Vorfall-Dokumentation überfällig: ${incident.title}`,
        impact: 10,
        category: "incidents",
      });
    }
  }

  for (const docType of missingTypes.slice(0, 5)) {
    const impact = 4;
    score -= impact;
    addDriver(drivers, {
      id: `doc-missing-${docType}`,
      label: `Pflichtdokument fehlt: ${getDocumentTypeLabel(docType)}`,
      impact,
      category: "documents",
    });
  }

  if (missingTypes.length > 5) {
    const extra = (missingTypes.length - 5) * 3;
    score -= extra;
    addDriver(drivers, {
      id: "doc-missing-more",
      label: `Weitere ${missingTypes.length - 5} Audit-Dokumente fehlen`,
      impact: extra,
      category: "documents",
    });
  }

  for (const doc of input.documents) {
    if (!doc.deadline) continue;
    if (new Date(doc.deadline) < new Date()) {
      const impact = doc.is_mandatory ? 7 : 3;
      score -= impact;
      addDriver(drivers, {
        id: `doc-exp-${doc.id}`,
        label: `Dokument abgelaufen: ${doc.title}`,
        impact,
        category: "documents",
      });
    }
  }

  if (!input.company?.nis2_status || input.company.nis2_status === "unbekannt") {
    score -= 10;
    addDriver(drivers, {
      id: "assessment-missing",
      label: "Betroffenheitscheck nicht abgeschlossen",
      impact: 10,
      category: "assessment",
    });
  }

  score = Math.max(0, Math.min(100, score));
  const level = securityLevelFromScore(score);

  drivers.sort((a, b) => b.impact - a.impact);

  const topDrivers = drivers.slice(0, 5);
  const summary = buildSummary(level, topDrivers, input);

  return {
    score,
    level,
    summary,
    drivers: drivers.slice(0, 20),
    auditReadinessPercent: audit.percent,
  };
}

function buildSummary(
  level: SecurityLevel,
  topDrivers: ScoreDriver[],
  input: {
    measures: Measure[];
    risks: Risk[];
    incidents: Incident[];
  }
): string {
  const criticalRisks = input.risks.filter((r) => r.risk_level === "high").length;
  const overdueMeasures = input.measures.filter((m) => {
    const o = resolveObligationStatus({
      status: m.status,
      deadline: m.deadline,
      criticality: m.criticality ?? m.priority,
      isMandatory: m.is_mandatory,
    });
    return o === "overdue" || o === "critically_overdue";
  }).length;
  const openIncidents = input.incidents.filter((i) => !isWorkComplete(i.status)).length;

  if (level === "stable") {
    return "Ihr Sicherheitsstatus ist aktuell stabil. Pflegen Sie Nachweise und Maßnahmen planmäßig.";
  }

  if (topDrivers.length === 0) {
    return "Aktuell besteht Handlungsbedarf. Prüfen Sie Risiken, Maßnahmen und Audit-Ordner.";
  }

  const parts: string[] = [];
  if (criticalRisks > 0) parts.push(`${criticalRisks} kritische${criticalRisks === 1 ? "s" : ""} Risiko${criticalRisks === 1 ? "" : "en"}`);
  if (overdueMeasures > 0) parts.push(`${overdueMeasures} überfällige Maßnahme${overdueMeasures === 1 ? "" : "n"}`);
  if (openIncidents > 0) parts.push(`${openIncidents} offene${openIncidents === 1 ? "r" : ""} Sicherheitsvorfall${openIncidents === 1 ? "" : "e"}`);

  if (parts.length === 0) {
    return `Aktuell besteht erhöhter Handlungsbedarf: ${topDrivers[0]?.label ?? "offene Punkte prüfen"}.`;
  }

  return `Aktuell besteht erhöhter Handlungsbedarf wegen ${parts.join(" und ")}.`;
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
