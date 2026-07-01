/** Frontend-/API-Aliase auf DB-Spaltennamen mappen */
export function normalizeIncidentUpdateFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...fields };

  if (out.closing_notes !== undefined && out.completion_notes === undefined) {
    out.completion_notes = out.closing_notes;
  }
  if (out.closed_by !== undefined && out.completed_by === undefined) {
    out.completed_by = out.closed_by;
  }
  if (out.closed_at !== undefined && out.completed_at === undefined) {
    out.completed_at = out.closed_at;
  }

  delete out.closing_notes;
  delete out.closed_by;
  delete out.closed_at;
  delete out.workflow_stage;
  delete out.tenant_id;
  delete out.updated_by;
  delete out.formState;

  return out;
}
