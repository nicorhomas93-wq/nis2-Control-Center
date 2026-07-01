import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError, getDbErrorMessage } from "@/lib/supabase/db-error";
import type { IncidentStatus } from "@/lib/types";

export const INCIDENT_BASE_FIELDS = ["status"] as const;

export const INCIDENT_COMPLIANCE_FIELDS = [
  "criticality",
  "deadline",
  "responsible",
  "escalation_level",
  "is_mandatory",
] as const;

export const INCIDENT_EXTENDED_FIELDS = [
  "incident_summary",
  "root_cause",
  "affected_assets",
  "affected_persons",
  "affected_systems",
  "data_categories",
  "estimated_impact",
  "containment_actions",
  "corrective_actions",
  "preventive_actions",
  "communication_required",
  "employee_letter_required",
  "employee_recipient_name",
  "employee_recipient_email",
  "employee_letter_text",
  "management_report_text",
  "audit_report_text",
  "completion_notes",
  "completed_at",
  "completed_by",
  "evidence_links",
  "generated_documents",
] as const;

const LEGACY_STATUS_MAP: Record<string, string> = {
  completed: "closed",
  waiting_feedback: "investigating",
  documentation_open: "investigating",
};

export function toDatabaseStatus(status: IncidentStatus): string {
  return LEGACY_STATUS_MAP[status] ?? status;
}

function pickFields(
  updates: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (updates[key] !== undefined) out[key] = updates[key];
  }
  return out;
}

async function applyIncidentUpdate(
  supabase: SupabaseClient,
  incidentId: string,
  fields: Record<string, unknown>
): Promise<{
  data: Record<string, unknown> | null;
  error: { code?: string; message?: string } | null;
}> {
  if (Object.keys(fields).length === 0) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("incidents")
    .update(fields)
    .eq("id", incidentId)
    .select()
    .single();

  return { data: data as Record<string, unknown> | null, error };
}

export async function updateIncidentRecord(
  supabase: SupabaseClient,
  incidentId: string,
  updates: Record<string, unknown>
): Promise<{
  data: Record<string, unknown> | null;
  error: string | null;
  warning: string | null;
  details?: unknown;
}> {
  const base = pickFields(updates, INCIDENT_BASE_FIELDS);
  const compliance = pickFields(updates, INCIDENT_COMPLIANCE_FIELDS);
  const extended = pickFields(updates, INCIDENT_EXTENDED_FIELDS);

  if (base.status !== undefined) {
    base.status = toDatabaseStatus(String(base.status) as IncidentStatus);
  }

  let lastData: Record<string, unknown> | null = null;
  const warnings: string[] = [];

  const tiers: { label: string; fields: Record<string, unknown>; hint: string }[] = [
    { label: "base", fields: base, hint: "" },
    {
      label: "compliance",
      fields: compliance,
      hint: "Compliance-Felder konnten nicht gespeichert werden — bitte Migration add_compliance_engine.sql ausführen.",
    },
    {
      label: "extended",
      fields: extended,
      hint: "Erweiterte Vorfallfelder fehlen in der Datenbank — bitte Migration add_incident_response_fields.sql ausführen.",
    },
  ];

  for (const tier of tiers) {
    if (Object.keys(tier.fields).length === 0) continue;

    const { data, error } = await applyIncidentUpdate(supabase, incidentId, tier.fields);

    if (error) {
      console.error(`Incident ${tier.label} update failed:`, error);
      if (isMissingColumnError(error)) {
        if (tier.hint) warnings.push(tier.hint);
        if (lastData) continue;
        return {
          data: null,
          error: getDbErrorMessage(error),
          warning: null,
          details: error,
        };
      }
      return {
        data: lastData,
        error: getDbErrorMessage(error),
        warning: warnings.length > 0 ? warnings.join(" ") : null,
        details: error,
      };
    }

    if (data) lastData = data;
  }

  if (!lastData) {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .single();
    if (error) {
      return { data: null, error: getDbErrorMessage(error), warning: null, details: error };
    }
    lastData = data as Record<string, unknown>;
  }

  const warning =
    warnings.length > 0
      ? `Basis gespeichert. ${warnings.join(" ")}`
      : null;

  return { data: lastData, error: null, warning };
}
