import type { Incident, IncidentStatus } from "@/lib/types";

export type IncidentActionStatus = "open" | "in_progress" | "completed";

export interface IncidentActionItem {
  id: string;
  title: string;
  description: string;
  responsible: string;
  deadline: string | null;
  status: IncidentActionStatus;
  evidence: string;
}

export interface GeneratedIncidentDocument {
  type: "management_report" | "audit_report" | "employee_letter" | "incident_summary";
  title: string;
  generated_at: string;
  content: string;
}

export const INCIDENT_STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: "open", label: "Offen" },
  { value: "investigating", label: "In Bearbeitung" },
  { value: "waiting_feedback", label: "Wartet auf Rückmeldung" },
  { value: "documentation_open", label: "Dokumentation offen" },
  { value: "completed", label: "Abgeschlossen" },
];

export const INCIDENT_PRIORITY_OPTIONS = [
  { value: "low", label: "Niedrig" },
  { value: "medium", label: "Mittel" },
  { value: "high", label: "Hoch" },
  { value: "critical", label: "Kritisch" },
] as const;

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  investigating: "In Bearbeitung",
  waiting_feedback: "Wartet auf Rückmeldung",
  documentation_open: "Dokumentation offen",
  completed: "Abgeschlossen",
  resolved: "Abgeschlossen",
  closed: "Abgeschlossen",
};

export interface IncidentFormState {
  status: IncidentStatus;
  priority: string;
  dueDate: string;
  assignedTo: string;
  escalationLevel: string;
  incidentSummary: string;
  rootCause: string;
  affectedAssets: string;
  affectedPersons: string;
  affectedSystems: string;
  dataCategories: string;
  estimatedImpact: string;
  containmentActions: IncidentActionItem[];
  correctiveActions: IncidentActionItem[];
  preventiveActions: IncidentActionItem[];
  communicationRequired: boolean;
  employeeLetterRequired: boolean;
  employeeRecipientName: string;
  employeeRecipientEmail: string;
  employeeLetterText: string;
  managementReportText: string;
  auditReportText: string;
  completionNotes: string;
  completedBy: string;
  evidenceLinks: string;
}

export function normalizeIncidentStatus(status: string): IncidentStatus {
  if (status === "resolved" || status === "closed") return "completed";
  if (
    status === "open" ||
    status === "investigating" ||
    status === "waiting_feedback" ||
    status === "documentation_open" ||
    status === "completed"
  ) {
    return status;
  }
  return "open";
}

export function parseIncidentActions(value: unknown): IncidentActionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as Partial<IncidentActionItem>;
      return {
        id: row.id ?? crypto.randomUUID(),
        title: row.title ?? "",
        description: row.description ?? "",
        responsible: row.responsible ?? "",
        deadline: row.deadline ?? null,
        status: row.status ?? "open",
        evidence: row.evidence ?? "",
      };
    });
}

export function parseGeneratedDocuments(value: unknown): GeneratedIncidentDocument[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as GeneratedIncidentDocument[];
}

export function incidentToFormState(incident: Incident): IncidentFormState {
  return {
    status: normalizeIncidentStatus(incident.status),
    priority: incident.criticality ?? "high",
    dueDate: incident.deadline?.slice(0, 16) ?? "",
    assignedTo: incident.responsible ?? "",
    escalationLevel: String(incident.escalation_level ?? 0),
    incidentSummary: incident.incident_summary ?? "",
    rootCause: incident.root_cause ?? "",
    affectedAssets: incident.affected_assets ?? "",
    affectedPersons: incident.affected_persons ?? "",
    affectedSystems: incident.affected_systems ?? "",
    dataCategories: incident.data_categories ?? "",
    estimatedImpact: incident.estimated_impact ?? "",
    containmentActions: parseIncidentActions(incident.containment_actions),
    correctiveActions: parseIncidentActions(incident.corrective_actions),
    preventiveActions: parseIncidentActions(incident.preventive_actions),
    communicationRequired: Boolean(incident.communication_required),
    employeeLetterRequired: Boolean(incident.employee_letter_required),
    employeeRecipientName: incident.employee_recipient_name ?? "",
    employeeRecipientEmail: incident.employee_recipient_email ?? "",
    employeeLetterText: incident.employee_letter_text ?? "",
    managementReportText: incident.management_report_text ?? "",
    auditReportText: incident.audit_report_text ?? "",
    completionNotes: incident.completion_notes ?? "",
    completedBy: incident.completed_by ?? "",
    evidenceLinks: incident.evidence_links ?? "",
  };
}

export function formStateToPayload(form: IncidentFormState): Record<string, unknown> {
  const isCompleted = form.status === "completed";
  return {
    status: form.status,
    criticality: form.priority,
    deadline: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    responsible: form.assignedTo.trim() || null,
    escalation_level: Number(form.escalationLevel) || 0,
    incident_summary: form.incidentSummary.trim() || null,
    root_cause: form.rootCause.trim() || null,
    affected_assets: form.affectedAssets.trim() || null,
    affected_persons: form.affectedPersons.trim() || null,
    affected_systems: form.affectedSystems.trim() || null,
    data_categories: form.dataCategories.trim() || null,
    estimated_impact: form.estimatedImpact.trim() || null,
    containment_actions: form.containmentActions,
    corrective_actions: form.correctiveActions,
    preventive_actions: form.preventiveActions,
    communication_required: form.communicationRequired,
    employee_letter_required: form.employeeLetterRequired,
    employee_recipient_name: form.employeeRecipientName.trim() || null,
    employee_recipient_email: form.employeeRecipientEmail.trim() || null,
    employee_letter_text: form.employeeLetterText.trim() || null,
    management_report_text: form.managementReportText.trim() || null,
    audit_report_text: form.auditReportText.trim() || null,
    completion_notes: form.completionNotes.trim() || null,
    completed_by: isCompleted ? form.completedBy.trim() || null : null,
    completed_at: isCompleted ? new Date().toISOString() : null,
    evidence_links: form.evidenceLinks.trim() || null,
  };
}
