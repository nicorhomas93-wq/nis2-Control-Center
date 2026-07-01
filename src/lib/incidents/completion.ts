import type { IncidentFormState } from "@/lib/incidents/types";

export interface IncidentCompletionResult {
  valid: boolean;
  errors: string[];
}

/** Pflichtfelder nur beim Status „Abgeschlossen“. */
export function validateIncidentClosure(form: IncidentFormState): IncidentCompletionResult {
  const errors: string[] = [];

  if (!form.completionNotes.trim()) {
    errors.push("Bitte Abschlussnotizen eintragen.");
  }
  if (!form.completedBy.trim() && !form.assignedTo.trim()) {
    errors.push("Bitte abgeschlossene Person eintragen.");
  }

  return { valid: errors.length === 0, errors };
}

/** Empfohlene Felder — blockieren keinen Zwischenspeicher. */
export function getIncidentClosureWarnings(form: IncidentFormState): string[] {
  const warnings: string[] = [];
  if (!form.incidentSummary.trim()) warnings.push("Kurzbeschreibung fehlt noch.");
  if (!form.affectedSystems.trim()) warnings.push("Betroffene Systeme sind noch nicht dokumentiert.");
  if (!form.evidenceLinks.trim()) warnings.push("Nachweise / Links sind noch nicht hinterlegt.");
  return warnings;
}
