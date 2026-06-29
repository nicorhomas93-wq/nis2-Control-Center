import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { validateIncidentCompletion } from "@/lib/incidents/completion";
import { incidentToFormState, normalizeIncidentStatus } from "@/lib/incidents/types";
import type { Incident } from "@/lib/types";

const UPDATABLE_FIELDS = [
  "status",
  "is_mandatory",
  "criticality",
  "deadline",
  "escalation_level",
  "responsible",
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

function pickUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of UPDATABLE_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (updates.status !== undefined) {
    updates.status = normalizeIncidentStatus(String(updates.status));
  }
  return updates;
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

  const { data: existing } = await supabase.from("incidents").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Vorfall nicht gefunden" }, { status: 404 });

  const company = await verifyCompanyOwnership(user.id, existing.company_id);
  if (!company) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });

  const updates = pickUpdates(body as Record<string, unknown>);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Felder zum Aktualisieren" }, { status: 400 });
  }

  if (updates.status === "completed") {
    const merged = incidentToFormState({ ...(existing as Incident), ...updates } as Incident);
    const validation = validateIncidentCompletion(merged);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Vorfall kann erst abgeschlossen werden, wenn alle Pflichtinformationen vollständig sind.",
          validation_errors: validation.errors,
        },
        { status: 400 }
      );
    }
    if (!updates.completed_at) updates.completed_at = new Date().toISOString();
  } else if (updates.status !== undefined) {
    updates.completed_at = null;
    updates.completed_by = null;
  }

  const { data, error } = await supabase
    .from("incidents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const message = getDbErrorMessage(error);
    const isPermission =
      error.code === "42501" ||
      message.toLowerCase().includes("permission") ||
      message.toLowerCase().includes("rls");
    return NextResponse.json(
      {
        error: isPermission
          ? "Keine Berechtigung zum Speichern. Bitte prüfen Sie Ihre Anmeldung und Mandantenzuordnung."
          : message,
      },
      { status: isPermission ? 403 : 500 }
    );
  }

  await syncCompanySecurityScore(supabase, existing.company_id);

  return NextResponse.json({ incident: data, success: true });
}
