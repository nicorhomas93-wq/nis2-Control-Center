import { resolveObligationStatus } from "@/lib/compliance/obligations";
import type { Document, Incident, Measure, Risk } from "@/lib/types";

export interface ComplianceWarning {
  id: string;
  title: string;
  detail: string;
  href: string;
}

export function buildComplianceWarnings(input: {
  measures: Measure[];
  risks: Risk[];
  incidents: Incident[];
  documents: Document[];
}): ComplianceWarning[] {
  const warnings: ComplianceWarning[] = [];

  for (const measure of input.measures) {
    const obligation = resolveObligationStatus({
      status: measure.status,
      deadline: measure.deadline,
      criticality: measure.criticality ?? measure.priority,
      isMandatory: measure.is_mandatory,
    });
    if (obligation === "critically_overdue") {
      warnings.push({
        id: `measure-${measure.id}`,
        title: measure.title,
        detail: "Kritische Pflichtmaßnahme überfällig — Sicherheitsscore reduziert",
        href: "/measures",
      });
    }
  }

  for (const risk of input.risks) {
    if (risk.risk_level === "low") continue;
    const obligation = resolveObligationStatus({
      status: "open",
      deadline: risk.deadline,
      criticality: risk.criticality,
      isMandatory: risk.is_mandatory,
    });
    if (obligation === "critically_overdue") {
      warnings.push({
        id: `risk-${risk.id}`,
        title: `Risiko: ${risk.asset}`,
        detail: "Kritische Pflichtaufgabe zur Risikominderung überfällig",
        href: "/risks",
      });
    }
  }

  for (const incident of input.incidents) {
    const obligation = resolveObligationStatus({
      status: incident.status,
      deadline: incident.deadline,
      criticality: incident.criticality,
      isMandatory: incident.is_mandatory,
    });
    if (obligation === "critically_overdue") {
      warnings.push({
        id: `incident-${incident.id}`,
        title: incident.title,
        detail: "Vorfall-Dokumentation kritisch überfällig — Nachweispflicht offen",
        href: "/incidents",
      });
    }
  }

  for (const doc of input.documents) {
    if (!doc.is_mandatory || !doc.deadline) continue;
    if (new Date(doc.deadline) < new Date()) {
      warnings.push({
        id: `doc-${doc.id}`,
        title: doc.title,
        detail: "Pflichtdokument abgelaufen — Erneuerung erforderlich",
        href: "/documents",
      });
    }
  }

  return warnings.slice(0, 5);
}
