import type { Incident } from "@/lib/types";
import type { GeneratedIncidentDocument, IncidentFormState } from "@/lib/incidents/types";
import { formatDate } from "@/lib/utils";

export function buildManagementReportText(
  incident: Incident,
  form: IncidentFormState,
  companyName?: string
): string {
  return [
    `MANAGEMENT-REPORT — SICHERHEITSVORFALL`,
    `Unternehmen: ${companyName ?? "—"}`,
    `Vorfall: ${incident.title}`,
    `Datum: ${formatDate(new Date().toISOString())}`,
    ``,
    `Kurzbeschreibung`,
    form.incidentSummary || incident.description || "—",
    ``,
    `Auswirkung`,
    form.estimatedImpact || "—",
    ``,
    `Sofortmaßnahmen (Auszug)`,
    ...form.containmentActions
      .filter((a) => a.status === "completed")
      .slice(0, 8)
      .map((a) => `- ${a.title}`),
    ``,
    `Status: ${form.status}`,
    `Verantwortlich: ${form.assignedTo || "—"}`,
  ].join("\n");
}

export function buildAuditReportText(incident: Incident, form: IncidentFormState): string {
  return [
    `AUDIT-NACHWEIS — INCIDENT RESPONSE`,
    `Vorfall-ID: ${incident.id}`,
    `Titel: ${incident.title}`,
    `Erstellt: ${formatDate(incident.created_at)}`,
    ``,
    `Ursache`,
    form.rootCause || "—",
    ``,
    `Betroffene Assets`,
    form.affectedAssets || "—",
    ``,
    `Betroffene Systeme`,
    form.affectedSystems || "—",
    ``,
    `Betroffene Personen`,
    form.affectedPersons || "—",
    ``,
    `Datenkategorien`,
    form.dataCategories || "—",
    ``,
    `Korrekturmaßnahmen`,
    ...form.correctiveActions.map(
      (a) => `- [${a.status}] ${a.title}${a.evidence ? ` — Nachweis: ${a.evidence}` : ""}`
    ),
    ``,
    `Präventivmaßnahmen`,
    ...form.preventiveActions.map((a) => `- [${a.status}] ${a.title}`),
    ``,
    `Nachweise / Links`,
    form.evidenceLinks || "—",
    ``,
    `Abschlussnotizen`,
    form.completionNotes || "—",
  ].join("\n");
}

export function buildEmployeeLetterText(
  incident: Incident,
  form: IncidentFormState,
  companyName?: string
): string {
  const name = form.employeeRecipientName || "Mitarbeiter/in";
  return [
    `${companyName ?? "Unternehmen"}`,
    ``,
    `Betreff: Hinweis zu Sicherheitsvorfall — ${incident.title}`,
    ``,
    `Guten Tag ${name},`,
    ``,
    `im Rahmen eines internen Sicherheitsvorfalls bitten wir Sie um Mitwirkung bzw. zur Kenntnisnahme.`,
    ``,
    form.employeeLetterText.trim() ||
      `Bitte bestätigen Sie, dass Sie keine Zugangsdaten weitergegeben haben und alle relevanten Informationen an ${form.assignedTo || "die IT"} melden.`,
    ``,
    `Mit freundlichen Grüßen`,
    form.assignedTo || "Informationssicherheit",
  ].join("\n");
}

export function buildGeneratedDocuments(
  incident: Incident,
  form: IncidentFormState,
  companyName?: string
): GeneratedIncidentDocument[] {
  const now = new Date().toISOString();
  return [
    {
      type: "management_report",
      title: `Management-Report — ${incident.title}`,
      generated_at: now,
      content: buildManagementReportText(incident, form, companyName),
    },
    {
      type: "audit_report",
      title: `Audit-Nachweis — ${incident.title}`,
      generated_at: now,
      content: buildAuditReportText(incident, form),
    },
    ...(form.employeeLetterRequired
      ? [
          {
            type: "employee_letter" as const,
            title: `Mitarbeiterschreiben — ${incident.title}`,
            generated_at: now,
            content: buildEmployeeLetterText(incident, form, companyName),
          },
        ]
      : []),
  ];
}
