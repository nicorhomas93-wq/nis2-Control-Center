import type { IncidentFormState } from "@/lib/incidents/types";

export interface IncidentCompletionResult {
  valid: boolean;
  errors: string[];
}

function completedCount(actions: IncidentFormState["containmentActions"]): number {
  return actions.filter((a) => a.status === "completed").length;
}

export function validateIncidentCompletion(form: IncidentFormState): IncidentCompletionResult {
  const errors: string[] = [];

  if (!form.incidentSummary.trim()) {
    errors.push("Kurzbeschreibung ist erforderlich.");
  }
  if (!form.rootCause.trim()) {
    errors.push("Ursache / Root Cause ist erforderlich.");
  }
  if (!form.affectedSystems.trim()) {
    errors.push("Betroffene Systeme müssen dokumentiert sein.");
  }
  if (!form.estimatedImpact.trim()) {
    errors.push("Geschätzte Auswirkung muss dokumentiert sein.");
  }
  if (completedCount(form.containmentActions) < 3) {
    errors.push("Mindestens 3 Sofortmaßnahmen müssen abgeschlossen sein.");
  }
  if (completedCount(form.correctiveActions) < 2) {
    errors.push("Mindestens 2 Korrekturmaßnahmen müssen abgeschlossen sein.");
  }
  if (!form.completionNotes.trim()) {
    errors.push("Abschlussnotizen sind erforderlich.");
  }
  if (form.employeeLetterRequired) {
    if (!form.employeeRecipientName.trim()) {
      errors.push("Empfängername für Mitarbeiterschreiben fehlt.");
    }
    if (!form.employeeLetterText.trim()) {
      errors.push("Mitarbeiterschreiben muss erstellt oder eingefügt sein.");
    }
  }

  return { valid: errors.length === 0, errors };
}
