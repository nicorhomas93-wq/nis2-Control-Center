import type { SupabaseClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/activity/log";

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  responsible: "Verantwortlicher",
  deadline: "Frist",
  criticality: "Kritikalität",
  is_mandatory: "Pflichtaufgabe",
  priority: "Priorität",
  title: "Titel",
  description: "Beschreibung",
  vulnerability: "Schwachstelle",
  business_impact: "Business Impact",
  completed_by: "Abgeschlossen von",
  completion_notes: "Abschlussnotiz",
};

export async function logFieldChanges(
  supabase: SupabaseClient,
  input: {
    companyId: string;
    userId: string;
    entityType: string;
    entityId: string;
    oldRow: Record<string, unknown>;
    updates: Record<string, unknown>;
    comment?: string;
  }
): Promise<void> {
  for (const [key, newValue] of Object.entries(input.updates)) {
    const oldValue = input.oldRow[key];
    if (oldValue === newValue) continue;
    if (newValue === undefined) continue;

    const label = FIELD_LABELS[key] ?? key;
    let action = "field_changed";
    if (key === "status") action = "status_changed";
    if (key === "responsible" || key === "completed_by") action = "assignee_changed";
    if (key === "deadline") action = "due_date_changed";

    await logActivity(supabase, {
      companyId: input.companyId,
      userId: input.userId,
      action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: { [key]: oldValue ?? null },
      newValue: { [key]: newValue },
      comment:
        input.comment ??
        `${label} wurde von „${formatValue(oldValue)}“ auf „${formatValue(newValue)}“ geändert.`,
    });
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString("de-DE");
  }
  return String(value);
}
