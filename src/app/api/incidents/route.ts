import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership, getOrCreateProfile } from "@/lib/company";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import { isWorkComplete } from "@/lib/compliance/obligations";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { validateIncidentClosure } from "@/lib/incidents/completion";
import { formatSupabaseError, normalizeSupabaseError } from "@/lib/incidents/errors";
import { normalizeIncidentUpdateFields } from "@/lib/incidents/payload";
import { formStateToPayload, incidentToFormState, normalizeIncidentStatus } from "@/lib/incidents/types";
import { updateIncidentRecord } from "@/lib/incidents/save";
import { autoTaskFromIncident } from "@/lib/tasks/generate";
import { logFieldChanges } from "@/lib/activity/changes";
import type { Incident } from "@/lib/types";

function errorResponse(
  error: unknown,
  status: number,
  extra?: Record<string, unknown>
) {
  const normalized = normalizeSupabaseError(error);
  return NextResponse.json(
    {
      error: typeof error === "string" ? error : formatSupabaseError(error),
      message: normalized.message ?? null,
      code: normalized.code ?? null,
      hint: normalized.hint ?? null,
      details: normalized.details ?? (typeof error === "object" ? error : null),
      ...extra,
    },
    { status }
  );
}

function applyCompletionRules(
  existing: Record<string, unknown>,
  updates: Record<string, unknown>,
  completedByFallback: string | null
) {
  const nextStatus = normalizeIncidentStatus(String(updates.status ?? existing.status));
  const isCompleting = nextStatus === "completed";

  if (isCompleting) {
    const mergedForm = incidentToFormState({
      ...(existing as unknown as Incident),
      ...updates,
      status: "completed",
    } as Incident);
    const validation = validateIncidentClosure(mergedForm);
    if (!validation.valid) {
      return { error: validation.errors.join(" "), validation_errors: validation.errors };
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

  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Nicht autorisiert", 401);

    const body = (await request.json()) as Record<string, unknown>;
    const companyId = typeof body.company_id === "string" ? body.company_id : null;
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!companyId) {
      return errorResponse("company_id erforderlich", 400);
    }
    if (!title) {
      return errorResponse("title erforderlich", 400);
    }

    const company = await verifyCompanyOwnership(user.id, companyId);
    if (!company) {
      return errorResponse(
        "Keine Berechtigung. Bitte Anmeldung und Mandantenzuordnung prüfen.",
        403
      );
    }

    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);

    const insertRow: Record<string, unknown> = {
      company_id: companyId,
      title,
      description: typeof body.description === "string" ? body.description : null,
      report_content: typeof body.report_content === "string" ? body.report_content : null,
      status: "open",
      is_mandatory: true,
      criticality: "critical",
      deadline: deadline.toISOString(),
      escalation_level: 0,
      ...normalizeIncidentUpdateFields(body),
    };

    delete insertRow.id;
    delete insertRow.company_id;
    insertRow.company_id = companyId;

    console.log("Incident POST insert:", { companyId, userId: user.id, insertRow });

    const { data, error } = await supabase
      .from("incidents")
      .insert(insertRow)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Incident insert failed:", { error, insertRow, userId: user.id, companyId });
      return errorResponse(error, 500);
    }

    if (!data) {
      return errorResponse("Vorfall konnte nicht erstellt werden (keine Zeile zurückgegeben).", 500);
    }

    try {
      await autoTaskFromIncident(supabase, data as Incident, user.id);
    } catch (taskError) {
      console.warn("Incident auto-task failed:", taskError);
    }

    try {
      await syncCompanySecurityScore(supabase, companyId);
    } catch (syncError) {
      console.warn("Incident insert: security score sync failed:", syncError);
    }

    return NextResponse.json({ incident: data, success: true });
  } catch (error) {
    console.error("Incident POST unhandled:", error);
    return errorResponse(error, 500);
  }
}

export async function PATCH(request: Request) {
  let incidentId: string | undefined;
  let userId: string | undefined;
  let companyId: string | undefined;
  let payload: Record<string, unknown> = {};

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Nicht autorisiert", 401);
    userId = user.id;

    const body = (await request.json()) as Record<string, unknown>;
    const { id, ...rawFields } = body;
    incidentId = typeof id === "string" ? id : undefined;

    if (!incidentId) {
      return errorResponse("id erforderlich — bitte zuerst Vorfall anlegen oder aus Liste wählen.", 400);
    }

    const { data: existing, error: fetchError } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .maybeSingle();

    if (fetchError) {
      console.error("Incident fetch failed:", fetchError);
      return errorResponse(fetchError, 500);
    }
    if (!existing) {
      return errorResponse("Vorfall nicht gefunden", 404);
    }

    companyId = String(existing.company_id);

    const company = await verifyCompanyOwnership(user.id, existing.company_id);
    if (!company) {
      return errorResponse(
        "Keine Berechtigung zum Speichern. Bitte prüfen Sie Ihre Anmeldung und Mandantenzuordnung.",
        403,
        { companyId }
      );
    }

    const profile = await getOrCreateProfile(user.id, user.email);
    const completedByFallback = profile?.full_name ?? user.email ?? null;

    let updates: Record<string, unknown> = normalizeIncidentUpdateFields({ ...rawFields });

    if (rawFields.formState && typeof rawFields.formState === "object") {
      updates = normalizeIncidentUpdateFields(
        formStateToPayload(rawFields.formState as Parameters<typeof formStateToPayload>[0], {
          completedByFallback,
        })
      );
    }

    delete updates.id;
    delete updates.company_id;

    if (Object.keys(updates).length === 0) {
      return errorResponse("Keine Felder zum Aktualisieren", 400);
    }

    payload = { id: incidentId, ...updates };

    const completionError = applyCompletionRules(existing, updates, completedByFallback);
    if (completionError) {
      return errorResponse(completionError.error, 400, {
        validation_errors: completionError.validation_errors,
      });
    }

    console.log("Incident PATCH:", {
      incidentId,
      userId,
      companyId,
      updates,
    });

    const result = await updateIncidentRecord(supabase, incidentId, updates);

    if (result.error) {
      console.error("Incident update failed:", {
        error: result.error,
        details: result.details,
        payload,
        incidentId,
        userId,
        companyId,
      });
      return errorResponse(result.error, 500, {
        details: result.details ?? null,
        payload,
        incidentId,
        companyId,
      });
    }

    await logFieldChanges(supabase, {
      companyId: existing.company_id,
      userId: user.id,
      entityType: "incident",
      entityId: incidentId,
      oldRow: existing as Record<string, unknown>,
      updates,
    });

    try {
      if (result.data) {
        await autoTaskFromIncident(supabase, result.data as unknown as Incident, user.id);
      }
      await syncCompanySecurityScore(supabase, existing.company_id);
    } catch (syncError) {
      console.warn("Incident PATCH: security score sync failed:", syncError);
    }

    return NextResponse.json({
      incident: result.data,
      success: true,
      warning: result.warning,
    });
  } catch (error) {
    console.error("Incident PATCH unhandled:", {
      error,
      payload,
      incidentId,
      userId,
      companyId,
    });
    return errorResponse(error, 500, { payload, incidentId, companyId });
  }
}
