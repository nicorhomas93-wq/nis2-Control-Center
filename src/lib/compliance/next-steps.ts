import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import { getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import {
  daysOverdue,
  isWorkComplete,
  normalizeCriticality,
  resolveObligationStatus,
} from "@/lib/compliance/obligations";
import {
  deriveRiskProblemTitle,
  displayRiskField,
  RISK_FIELD_FALLBACKS,
} from "@/lib/compliance/risk-display";
import { isRiskTreated } from "@/lib/compliance/risk-treatment";
import { resolveRiskAsset } from "@/lib/assets/resolve";
import type { CriticalityLevel, NextStepAction, SecurityStatusResult } from "@/lib/compliance/types";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";
import type { TaskItem } from "@/lib/tasks/types";
import { isTaskOpen } from "@/lib/tasks/types";

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

function isActiveRisk(risk: Risk, measures: Measure[]): boolean {
  if (risk.risk_level === "low") return false;
  if (risk.treatment_status === "treated" || risk.treatment_status === "reduced") return false;
  return !isRiskTreated(risk, measures);
}

function hasOpenTaskFor(tasks: TaskItem[] | undefined, relatedType: string, relatedId: string): boolean {
  if (!tasks?.length) return false;
  return tasks.some(
    (t) =>
      t.related_type === relatedType &&
      t.related_id === relatedId &&
      isTaskOpen(t.status)
  );
}

export function buildNextSteps(
  input: {
    company?: Pick<Company, "vendors_applicability"> | null;
    documents: Document[];
    measures: Measure[];
    risks: Risk[];
    incidents: Incident[];
    assets?: import("@/lib/assets/types").CompanyAsset[];
    tasks?: TaskItem[];
  },
  securityStatus?: SecurityStatusResult
): NextStepAction[] {
  if (
    securityStatus &&
    securityStatus.score >= 100 &&
    securityStatus.auditReadiness.percent >= 100 &&
    securityStatus.drivers.length === 0
  ) {
    return [];
  }

  const assets = input.assets ?? [];
  const actions: NextStepAction[] = [];
  const driverIds = new Set(securityStatus?.drivers.map((d) => d.id) ?? []);

  for (const measure of input.measures) {
    if (isWorkComplete(measure.status)) continue;
    if (hasOpenTaskFor(input.tasks, "measure", measure.id) && measure.status === "completed") continue;

    if (securityStatus && driverIds.size > 0) {
      const hasDriver =
        driverIds.has(`measure-overdue-${measure.id}`) ||
        driverIds.has(`measure-high-${measure.id}`) ||
        driverIds.has(`measure-mandatory-${measure.id}`);
      if (!hasDriver) continue;
    }

    const obligation = resolveObligationStatus({
      status: measure.status,
      deadline: measure.deadline,
      criticality: measure.criticality ?? measure.priority,
      isMandatory: measure.is_mandatory,
    });
    const priority = normalizeCriticality(measure.criticality ?? measure.priority);
    const overdueDays = daysOverdue(measure.deadline);

    let reason = "Offene Maßnahme mit Audit-Relevanz";
    if (obligation === "critically_overdue") {
      reason = `Kritisch überfällig — Score und Audit-Bereitschaft werden belastet${overdueDays > 0 ? ` (${overdueDays} Tage)` : ""}`;
    } else if (obligation === "overdue") {
      reason = `Frist überschritten${overdueDays > 0 ? ` seit ${overdueDays} Tagen` : ""} — Nachweis fehlt`;
    } else if (measure.is_mandatory) {
      reason = "Pflichtmaßnahme — für Audit-Bereitschaft erforderlich";
    }

    actions.push({
      id: `measure-${measure.id}`,
      title: measure.title,
      reason,
      priority,
      deadline: measure.deadline ?? null,
      href: "/measures",
      asset: measure.responsible ?? "Organisation",
      recommendation:
        measure.target_state ??
        "Maßnahme umsetzen, Verantwortlichkeit bestätigen und Status auf erledigt setzen",
      sortScore:
        priorityWeight(priority) +
        (obligation === "critically_overdue" ? 50 : obligation === "overdue" ? 30 : 0) +
        overdueDays,
    });
  }

  for (const risk of input.risks) {
    if (!isActiveRisk(risk, input.measures)) continue;

    if (securityStatus && driverIds.size > 0) {
      const hasDriver =
        driverIds.has(`risk-open-${risk.id}`) || driverIds.has(`risk-overdue-${risk.id}`);
      if (!hasDriver) continue;
    }

    const priority: CriticalityLevel =
      normalizeCriticality(risk.criticality) === "critical" || risk.risk_level === "high"
        ? "critical"
        : "high";
    const obligation = resolveObligationStatus({
      status: "open",
      deadline: risk.deadline,
      criticality: risk.criticality ?? priority,
      isMandatory: risk.is_mandatory,
    });

    const measureText = displayRiskField(risk.measure, RISK_FIELD_FALLBACKS.measure);
    const title = deriveRiskProblemTitle(risk);

    actions.push({
      id: `risk-${risk.id}`,
      title,
      reason:
        obligation === "overdue" || obligation === "critically_overdue"
          ? `Risikomaßnahme überfällig — ${displayRiskField(risk.threat, RISK_FIELD_FALLBACKS.threat)}`
          : `Offenes ${risk.risk_level === "high" ? "hohes" : "mittleres"} Risiko: ${displayRiskField(risk.threat, RISK_FIELD_FALLBACKS.threat)}`,
      priority,
      deadline: risk.deadline ?? null,
      href: "/risks",
      asset: resolveRiskAsset(risk, assets).name,
      recommendation: measureText,
      sortScore:
        priorityWeight(priority) +
        (risk.risk_level === "high" ? 25 : 10) +
        (obligation === "overdue" ? 20 : 0),
    });
  }

  for (const incident of input.incidents) {
    if (isWorkComplete(incident.status)) continue;

    if (securityStatus && driverIds.size > 0) {
      const hasDriver =
        driverIds.has(`incident-open-${incident.id}`) ||
        driverIds.has(`incident-progress-${incident.id}`);
      if (!hasDriver) continue;
    }

    const priority = normalizeCriticality(incident.criticality ?? "high");
    const obligation = resolveObligationStatus({
      status: incident.status,
      deadline: incident.deadline,
      criticality: incident.criticality,
      isMandatory: incident.is_mandatory,
    });

    actions.push({
      id: `incident-${incident.id}`,
      title: `Incident vom ${new Date(incident.created_at).toLocaleDateString("de-DE")} dokumentieren`,
      reason:
        obligation === "overdue" || obligation === "critically_overdue"
          ? "Nachweispflicht offen — Melde- und Dokumentationsfrist überschritten"
          : incident.status === "investigating"
            ? "Untersuchung läuft — Abschluss und Nachweis im Audit-Ordner fehlen"
            : "Sicherheitsvorfall erfordert vollständige Dokumentation",
      priority,
      deadline: incident.deadline ?? null,
      href: "/incidents",
      asset: incident.title,
      recommendation:
        "Vorfallbericht vervollständigen, Verantwortliche benennen und Status auf erledigt setzen",
      sortScore: priorityWeight(priority) + 35,
    });
  }

  const missing = getMissingAuditDocumentTypes(
    input.documents,
    input.company ?? null
  );
  for (const docType of missing.slice(0, 3)) {
    if (securityStatus && driverIds.size > 0 && !driverIds.has(`doc-missing-${docType}`)) {
      continue;
    }

    const label = getDocumentTypeLabel(docType);
    actions.push({
      id: `doc-${docType}`,
      title: `${label} erstellen`,
      reason: "Pflichtdokument fehlt im Audit-Ordner — Audit-Bereitschaft wird reduziert",
      priority: "high",
      deadline: null,
      href: "/documents",
      asset: "Audit-Ordner",
      recommendation: `Dokument generieren, prüfen und als Nachweis im Audit-Ordner ablegen`,
      sortScore: 55,
    });
  }

  if (securityStatus && securityStatus.score >= 100 && securityStatus.auditReadiness.percent >= 100) {
    return [];
  }

  return actions.sort((a, b) => b.sortScore - a.sortScore).slice(0, 5);
}

export function formatStepDeadline(deadline: string | null): string {
  if (!deadline) return "Frist noch nicht gesetzt";
  return new Date(deadline).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
