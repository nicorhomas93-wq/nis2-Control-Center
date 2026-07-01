import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership, getOrCreateProfile } from "@/lib/company";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import { isWorkComplete } from "@/lib/compliance/obligations";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { validateIncidentClosure } from "@/lib/incidents/completion";
import { formStateToPayload, incidentToFormState, normalizeIncidentStatus } from "@/lib/incidents/types";
import { updateIncidentRecord } from "@/lib/incidents/save";
import type { Incident } from "@/lib/types";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { id, ...fields } = body as Record<string, unknown>;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id erforderlich" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("Incident fetch failed:", fetchError);
    return NextResponse.json({ error: getDbErrorMessage(fetchError) }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: "Vorfall nicht gefunden" }, { status: 404 });

  const company = await verifyCompanyOwnership(user.id, existing.company_id);
  if (!company) {
    return NextResponse.json(
      {
        error:
          "Keine Berechtigung zum Speichern. Bitte prüfen Sie Ihre Anmeldung und Mandantenzuordnung.",
      },
      { status: 403 }
    );
  }

  const profile = await getOrCreateProfile(user.id, user.email);
  const completedByFallback = profile?.full_name ?? user.email ?? null;

  let updates: Record<string, unknown> = { ...fields };

  if (fields.formState && typeof fields.formState === "object") {
    updates = formStateToPayload(fields.formState as Parameters<typeof formStateToPayload>[0], {
      completedByFallback,
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Felder zum Aktualisieren" }, { status: 400 });
  }

  const nextStatus = normalizeIncidentStatus(
    String(updates.status ?? existing.status)
  );
  const isCompleting = nextStatus === "completed";

  if (isCompleting) {
    const mergedForm = incidentToFormState({
      ...(existing as Incident),
      ...updates,
      status: "completed",
    } as Incident);
    const validation = validateIncidentClosure(mergedForm);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.errors.join(" "),
          validation_errors: validation.errors,
        },
        { status: 400 }
      );
    }
    if (!updates.completed_at) updates.completed_at = new Date().toISOString();
    if (!updates.completed_by) {
      updates.completed_by =
        mergedForm.completedBy.trim() ||
        mergedForm.assignedTo.trim() ||
        completedByFallback;
    }
  } else if (
    updates.status !== undefined &&
    isWorkComplete(String(existing.status)) &&
    !isWorkComplete(String(updates.status))
  ) {
    updates.completed_at = null;
    updates.completed_by = null;
  } else {
    delete updates.completed_at;
    delete updates.completed_by;
  }

  console.log("Incident PATCH updates:", { id, updates });

  const result = await updateIncidentRecord(supabase, id, updates);

  if (result.error) {
    console.error("Incident update failed:", result.details ?? result.error);
    return NextResponse.json(
      {
        error: result.error,
        details: result.details ?? null,
      },
      { status: 500 }
    );
  }

  await syncCompanySecurityScore(supabase, existing.company_id);

  return NextResponse.json({
    incident: result.data,
    success: true,
    warning: result.warning,
  });
}
