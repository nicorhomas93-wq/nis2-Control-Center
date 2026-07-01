import type { SupabaseClient } from "@supabase/supabase-js";

export interface LogActivityInput {
  companyId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  comment?: string;
}

export interface ActivityLogRow {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value_json: Record<string, unknown> | null;
  new_value_json: Record<string, unknown> | null;
  comment: string | null;
  created_at: string;
}

export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput
): Promise<void> {
  await supabase.from("activity_log").insert({
    company_id: input.companyId,
    user_id: input.userId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    old_value_json: input.oldValue ?? null,
    new_value_json: input.newValue ?? null,
    comment: input.comment ?? null,
  });
}

export async function loadEntityActivity(
  supabase: SupabaseClient,
  companyId: string,
  entityType: string,
  entityId: string,
  limit = 50
): Promise<ActivityLogRow[]> {
  const { data } = await supabase
    .from("activity_log")
    .select("*")
    .eq("company_id", companyId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ActivityLogRow[];
}

export function formatActivityMessage(row: ActivityLogRow, userName?: string): string {
  const who = userName ?? "Ein Benutzer";
  switch (row.action) {
    case "task_completed":
      return `${who} hat die Aufgabe auf erledigt gesetzt.`;
    case "task_waiting_evidence":
      return `${who} hat die Aufgabe abgeschlossen — Nachweis fehlt noch.`;
    case "evidence_added":
      return "Nachweis wurde hochgeladen.";
    case "status_changed":
      return `${who} hat den Status geändert.`;
    case "assignee_changed":
      return `${who} hat den Verantwortlichen geändert.`;
    case "due_date_changed":
      return `${who} hat die Frist geändert.`;
    case "comment_added":
      return `${who} hat einen Kommentar hinzugefügt.`;
    default:
      return row.comment ?? `${who}: ${row.action}`;
  }
}
