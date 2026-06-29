import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import { getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import {
  daysOverdue,
  isWorkComplete,
  normalizeCriticality,
  resolveObligationStatus,
} from "@/lib/compliance/obligations";
import type { CriticalityLevel, NextStepAction } from "@/lib/compliance/types";
import type { Document, Incident, Measure, Risk } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function priorityWeight(p: CriticalityLevel): number {
  switch (p) {
    case "critical":
      return 100;
    case "high":
      return 70;
    case "medium":
      return 40;
    default:
      return 20;
  }
}

export function buildNextSteps(input: {
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  incidents: Incident[];
}): NextStepAction[] {
  const actions: NextStepAction[] = [];

  for (const measure of input.measures) {
    if (isWorkComplete(measure.status)) continue;
    const obligation = resolveObligationStatus({
      status: measure.status,
      deadline: measure.deadline,
      criticality: measure.criticality ?? measure.priority,
      isMandatory: measure.is_mandatory,
    });
    const priority = normalizeCriticality(measure.criticality ?? measure.priority);
    const overdueDays = daysOverdue(measure.deadline);

    let reason = "Maßnahme noch offen";
    if (obligation === "critically_overdue") {
      reason = `Kritisch überfällig${overdueDays > 0 ? ` seit ${overdueDays} Tagen` : ""}`;
    } else if (obligation === "overdue") {
      reason = `Überfällig${overdueDays > 0 ? ` seit ${overdueDays} Tagen` : ""}`;
    } else if (measure.is_mandatory) {
      reason = "Pflichtmaßnahme — Audit-relevant";
    } else if (priority === "critical") {
      reason = "Kritische Priorität";
    }

    actions.push({
      id: `measure-${measure.id}`,
      title: measure.title,
      reason,
      priority,
      deadline: measure.deadline ?? null,
      href: "/measures",
      sortScore:
        priorityWeight(priority) +
        (obligation === "critically_overdue" ? 50 : obligation === "overdue" ? 30 : 0) +
        overdueDays,
    });
  }

  for (const risk of input.risks) {
    if (risk.risk_level === "low") continue;
    const priority: CriticalityLevel = risk.risk_level === "high" ? "critical" : "high";
    const obligation = resolveObligationStatus({
      status: "open",
      deadline: risk.deadline,
      criticality: risk.criticality ?? priority,
      isMandatory: risk.is_mandatory,
    });

    actions.push({
      id: `risk-${risk.id}`,
      title: `Risiko ${risk.asset} absichern`,
      reason:
        obligation === "overdue" || obligation === "critically_overdue"
          ? `Risiko-Maßnahme überfällig (${risk.threat})`
          : `Hohes Risiko: ${risk.threat}`,
      priority,
      deadline: risk.deadline ?? null,
      href: "/risks",
      sortScore: priorityWeight(priority) + (risk.risk_level === "high" ? 25 : 10),
    });
  }

  for (const incident of input.incidents) {
    if (isWorkComplete(incident.status)) continue;
    const priority = normalizeCriticality(incident.criticality ?? "high");
    const obligation = resolveObligationStatus({
      status: incident.status,
      deadline: incident.deadline,
      criticality: incident.criticality,
      isMandatory: incident.is_mandatory,
    });

    actions.push({
      id: `incident-${incident.id}`,
      title: `Vorfall dokumentieren: ${incident.title}`,
      reason:
        obligation === "overdue" || obligation === "critically_overdue"
          ? "Nachweispflicht offen — Frist überschritten"
          : incident.status === "investigating"
            ? "Untersuchung läuft — Dokumentation vervollständigen"
            : "Sicherheitsvorfall erfordert Dokumentation",
      priority,
      deadline: incident.deadline ?? null,
      href: "/incidents",
      sortScore: priorityWeight(priority) + 35,
    });
  }

  const missing = getMissingAuditDocumentTypes(input.documents);
  for (const docType of missing.slice(0, 3)) {
    actions.push({
      id: `doc-${docType}`,
      title: `${getDocumentTypeLabel(docType)} erstellen`,
      reason: "Pflichtdokument fehlt im Audit-Ordner",
      priority: "high",
      deadline: null,
      href: "/documents",
      sortScore: 55,
    });
  }

  return actions.sort((a, b) => b.sortScore - a.sortScore).slice(0, 5);
}

export function formatStepDeadline(deadline: string | null): string {
  if (!deadline) return "Keine Frist";
  return formatDate(deadline);
}
