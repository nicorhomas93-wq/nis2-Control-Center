import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError, getDbErrorMessage } from "@/lib/supabase/db-error";
import { formatSupabaseError, type SupabaseErrorShape } from "@/lib/incidents/errors";
import type { IncidentStatus } from "@/lib/types";

export const INCIDENT_BASE_FIELDS = ["status"] as const;

export const INCIDENT_COMPLIANCE_FIELDS = [
  "criticality",
  "deadline",
  "responsible",
  "escalation_level",
  "is_mandatory",
] as const;

/** Abschluss & Nachweise — häufig benötigt, separat speichern */
export const INCIDENT_CLOSURE_FIELDS = [
  "completion_notes",
  "completed_at",
  "completed_by",
  "evidence_links",
] as const;

export const INCIDENT_DOCUMENTATION_FIELDS = [
  "incident_summary",
  "root_cause",
  "affected_assets",
  "affected_persons",
  "affected_systems",
  "data_categories",
  "estimated_impact",
  "management_report_text",
  "audit_report_text",
] as const;

export const INCIDENT_ACTION_FIELDS = [
  "containment_actions",
  "corrective_actions",
  "preventive_actions",
] as const;

export const INCIDENT_COMMUNICATION_FIELDS = [
  "communication_required",
  "employee_letter_required",
  "employee_recipient_name",
  "employee_recipient_email",
  "employee_letter_text",
  "generated_documents",
] as const;

const LEGACY_STATUS_MAP: Record<string, string> = {
  completed: "closed",
  waiting_feedback: "investigating",
  documentation_open: "investigating",
};

const MODERN_STATUS_VALUES = new Set([
  "open",
  "investigating",
  "waiting_feedback",
  "documentation_open",
  "completed",
  "resolved",
  "closed",
]);

export function toDatabaseStatus(status: IncidentStatus, preferModern = true): string {
  if (preferModern && MODERN_STATUS_VALUES.has(status)) {
    return status;
  }
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

function isNoRowsError(error: SupabaseErrorShape | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST116" ||
    error.message?.includes("0 rows") === true ||
    error.message?.includes("no rows") === true
  );
}

async function applyIncidentUpdate(
  supabase: SupabaseClient,
  incidentId: string,
  fields: Record<string, unknown>
): Promise<{
  data: Record<string, unknown> | null;
  error: SupabaseErrorShape | null;
}> {
  if (Object.keys(fields).length === 0) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("incidents")
    .update(fields)
    .eq("id", incidentId)
    .select()
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return {
      data: null,
      error: {
        code: "INCIDENT_NOT_UPDATED",
        message:
          "Keine Zeile aktualisiert. Bitte prüfen Sie Vorfall-ID, Mandantenzuordnung und Berechtigungen (RLS).",
      },
    };
  }

  return { data: data as Record<string, unknown>, error: null };
}

async function applyStatusUpdate(
  supabase: SupabaseClient,
  incidentId: string,
  status: unknown
): Promise<{
  data: Record<string, unknown> | null;
  error: SupabaseErrorShape | null;
}> {
  const raw = String(status) as IncidentStatus;

  let result = await applyIncidentUpdate(supabase, incidentId, {
    status: toDatabaseStatus(raw, true),
  });

  if (result.error?.code === "23514" || result.error?.message?.includes("check constraint")) {
    const legacy = toDatabaseStatus(raw, false);
    if (legacy !== raw) {
      result = await applyIncidentUpdate(supabase, incidentId, { status: legacy });
    }
  }

  return result;
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
  const baseStatus = updates.status;
  const compliance = pickFields(updates, INCIDENT_COMPLIANCE_FIELDS);
  const closure = pickFields(updates, INCIDENT_CLOSURE_FIELDS);
  const documentation = pickFields(updates, INCIDENT_DOCUMENTATION_FIELDS);
  const actions = pickFields(updates, INCIDENT_ACTION_FIELDS);
  const communication = pickFields(updates, INCIDENT_COMMUNICATION_FIELDS);

  let lastData: Record<string, unknown> | null = null;
  const warnings: string[] = [];

  const tiers: {
    label: string;
    apply: () => Promise<{ data: Record<string, unknown> | null; error: SupabaseErrorShape | null }>;
    hint: string;
  }[] = [
    {
      label: "status",
      apply: () =>
        baseStatus !== undefined
          ? applyStatusUpdate(supabase, incidentId, baseStatus)
          : Promise.resolve({ data: null, error: null }),
      hint: "",
    },
    {
      label: "compliance",
      apply: () => applyIncidentUpdate(supabase, incidentId, compliance),
      hint: "Compliance-Felder konnten nicht gespeichert werden — Migration add_compliance_engine.sql ausführen.",
    },
    {
      label: "closure",
      apply: () => applyIncidentUpdate(supabase, incidentId, closure),
      hint: "Abschlussfelder fehlen in der Datenbank — Migration add_incident_response_fields.sql ausführen.",
    },
    {
      label: "documentation",
      apply: () => applyIncidentUpdate(supabase, incidentId, documentation),
      hint: "Dokumentationsfelder fehlen in der Datenbank — Migration add_incident_response_fields.sql ausführen.",
    },
    {
      label: "actions",
      apply: () => applyIncidentUpdate(supabase, incidentId, actions),
      hint: "Maßnahmen-Felder fehlen in der Datenbank — Migration add_incident_response_fields.sql ausführen.",
    },
    {
      label: "communication",
      apply: () => applyIncidentUpdate(supabase, incidentId, communication),
      hint: "Kommunikationsfelder fehlen in der Datenbank — Migration add_incident_response_fields.sql ausführen.",
    },
  ];

  for (const tier of tiers) {
    const hasFields =
      tier.label === "status" ? baseStatus !== undefined : Object.keys(
          tier.label === "compliance"
            ? compliance
            : tier.label === "closure"
              ? closure
              : tier.label === "documentation"
                ? documentation
                : tier.label === "actions"
                  ? actions
                  : communication
        ).length > 0;

    if (!hasFields) continue;

    const { data, error } = await tier.apply();

    if (error) {
      console.error(`Incident ${tier.label} update failed:`, error);

      if (isMissingColumnError(error)) {
        if (tier.hint) warnings.push(tier.hint);
        continue;
      }

      if (isNoRowsError(error)) {
        if (!lastData) {
          return {
            data: null,
            error: formatSupabaseError(error),
            warning: null,
            details: error,
          };
        }
        continue;
      }

      return {
        data: lastData,
        error: formatSupabaseError(error),
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
      .maybeSingle();
    if (error) {
      return { data: null, error: getDbErrorMessage(error), warning: null, details: error };
    }
    lastData = (data as Record<string, unknown> | null) ?? null;
  }

  const warning =
    warnings.length > 0 ? `Teilweise gespeichert. ${warnings.join(" ")}` : null;

  return { data: lastData, error: null, warning };
}
