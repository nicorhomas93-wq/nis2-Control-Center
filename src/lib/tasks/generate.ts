import type { SupabaseClient } from "@supabase/supabase-js";
import { createTaskIfNotExists } from "@/lib/tasks/service";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";
import { isWorkComplete } from "@/lib/compliance/obligations";
import { getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import { deriveRiskProblemTitle } from "@/lib/compliance/risk-display";

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function autoTaskFromRisk(
  supabase: SupabaseClient,
  risk: Risk,
  createdBy?: string
): Promise<void> {
  const level = risk.criticality ?? risk.risk_level;
  if (level !== "high" && level !== "critical") return;

  const riskTitle = deriveRiskProblemTitle(risk);

  await createTaskIfNotExists(supabase, {
    companyId: risk.company_id,
    title: "Risiko bewerten und Maßnahme definieren",
    description: riskTitle,
    taskType: "risk",
    priority: level === "critical" ? "critical" : "high",
    dueDate: risk.deadline,
    assignedTo: null,
    createdBy,
    relatedType: "risk",
    relatedId: risk.id,
    evidenceRequired: true,
  });
}

export async function autoTaskFromMeasure(
  supabase: SupabaseClient,
  measure: Measure,
  createdBy?: string
): Promise<void> {
  await createTaskIfNotExists(supabase, {
    companyId: measure.company_id,
    title: "Maßnahme umsetzen",
    description: measure.title,
    taskType: "measure",
    priority:
      measure.criticality === "critical" || measure.priority === "high"
        ? "high"
        : "medium",
    dueDate: measure.deadline,
    assignedTo: null,
    createdBy,
    relatedType: "measure",
    relatedId: measure.id,
    evidenceRequired: Boolean(measure.is_mandatory),
  });

  if (measure.is_mandatory) {
    await createTaskIfNotExists(supabase, {
      companyId: measure.company_id,
      title: "Nachweis hochladen",
      description: `Nachweis für Maßnahme: ${measure.title}`,
      taskType: "evidence",
      priority: "medium",
      dueDate: measure.deadline,
      createdBy,
      relatedType: "measure",
      relatedId: measure.id,
      evidenceRequired: true,
    });
  }
}

export async function autoTaskFromDocument(
  supabase: SupabaseClient,
  doc: Document,
  createdBy?: string
): Promise<void> {
  if (!doc.deadline) return;
  const days = daysUntil(doc.deadline);
  if (days > 30) return;

  await createTaskIfNotExists(supabase, {
    companyId: doc.company_id,
    title: "Dokument prüfen und aktualisieren",
    description: doc.title,
    taskType: "document",
    priority: days <= 7 ? "high" : "medium",
    dueDate: doc.deadline,
    createdBy,
    relatedType: "document",
    relatedId: doc.id,
    evidenceRequired: true,
  });
}

export async function autoTaskFromIncident(
  supabase: SupabaseClient,
  incident: Incident,
  createdBy?: string
): Promise<void> {
  await createTaskIfNotExists(supabase, {
    companyId: incident.company_id,
    title: "Incident bewerten und dokumentieren",
    description: incident.title,
    taskType: "incident",
    priority: "critical",
    dueDate: incident.deadline,
    createdBy,
    relatedType: "incident",
    relatedId: incident.id,
    evidenceRequired: true,
  });

  if (!isWorkComplete(incident.status)) {
    await createTaskIfNotExists(supabase, {
      companyId: incident.company_id,
      title: "Incident-Abschluss vervollständigen",
      description: incident.title,
      taskType: "incident",
      priority: "high",
      createdBy,
      relatedType: "incident_completion",
      relatedId: incident.id,
      evidenceRequired: true,
    });
  }
}

export async function autoTaskFromAuditGaps(
  supabase: SupabaseClient,
  companyId: string,
  documents: Document[],
  createdBy?: string,
  company?: Pick<Company, "vendors_applicability"> | null
): Promise<void> {
  const missing = getMissingAuditDocumentTypes(documents, company);
  for (const docType of missing) {
    await createTaskIfNotExists(supabase, {
      companyId,
      title: "Audit-Nachweis ergänzen",
      description: `Fehlendes Pflichtdokument: ${docType}`,
      taskType: "audit",
      priority: "high",
      createdBy,
      relatedType: "audit_document",
      relatedId: docType,
      evidenceRequired: true,
    });
  }
}

export async function runAutoTasksForCompany(
  supabase: SupabaseClient,
  companyId: string,
  data: {
    company?: Pick<Company, "vendors_applicability"> | null;
    risks: Risk[];
    measures: Measure[];
    documents: Document[];
    incidents: Incident[];
  },
  createdBy?: string
): Promise<void> {
  for (const risk of data.risks) {
    await autoTaskFromRisk(supabase, risk, createdBy);
  }
  for (const measure of data.measures) {
    if (!isWorkComplete(measure.status)) {
      await autoTaskFromMeasure(supabase, measure, createdBy);
    }
  }
  for (const doc of data.documents) {
    await autoTaskFromDocument(supabase, doc, createdBy);
  }
  for (const incident of data.incidents) {
    await autoTaskFromIncident(supabase, incident, createdBy);
  }
  await autoTaskFromAuditGaps(supabase, companyId, data.documents, createdBy, data.company);
}
