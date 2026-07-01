import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import { calculateSecurityStatus } from "@/lib/compliance/security-status";
import { reconcileMeasureCompliance } from "@/lib/compliance/measure-risk-link";
import { buildScoreFeedbackMessage } from "@/lib/compliance/score-feedback";
import { isWorkComplete } from "@/lib/compliance/obligations";
import {
  loadCompanyComplianceData,
  syncAndReturnComplianceSnapshot,
} from "@/lib/compliance/sync";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { autoTaskFromMeasure } from "@/lib/tasks/generate";
import type { Measure } from "@/lib/types";
import { logFieldChanges } from "@/lib/activity/changes";

async function buildComplianceResponse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  beforeScore: number,
  context: {
    measureCompleted?: boolean;
    missingEvidence?: boolean;
    hasOpenMandatoryMeasures?: boolean;
  }
) {
  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  const scoreDelta = snapshot.securityStatus.score - beforeScore;

  return {
    securityStatus: snapshot.securityStatus,
    nextSteps: snapshot.nextSteps,
    scoreDelta,
    feedbackMessage: buildScoreFeedbackMessage(scoreDelta, context),
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const {
    companyId,
    title,
    description,
    priority,
    responsible,
    target_state,
    is_mandatory,
    criticality,
    deadline,
    escalation_level,
    asset_id,
    risk_id,
  } = body;

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const beforeData = await loadCompanyComplianceData(supabase, companyId);
  const beforeStatus = calculateSecurityStatus(beforeData);

  const { data: measure, error } = await supabase.from("measures").insert({
    company_id: companyId,
    title,
    description,
    priority: priority ?? "medium",
    criticality: criticality ?? priority ?? "medium",
    responsible,
    target_state,
    status: "open",
    is_mandatory: Boolean(is_mandatory),
    deadline: deadline || null,
    escalation_level: escalation_level ?? 0,
    asset_id: asset_id || null,
    risk_id: risk_id || null,
  }).select().single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  const updatedRisk = await reconcileMeasureCompliance(supabase, measure.id, companyId);

  await supabase.from("compliance_events").insert({
    company_id: companyId,
    event_type: "measure_created",
    title: "Maßnahme erfasst",
    details: measure.title,
    risk_id: measure.risk_id ?? updatedRisk?.id ?? null,
    measure_id: measure.id,
  });

  await autoTaskFromMeasure(supabase, measure as Measure, user.id);

  const compliance = await buildComplianceResponse(supabase, companyId, beforeStatus.score, {
    missingEvidence:
      getMissingAuditDocumentTypes(beforeData.documents, beforeData.company).length > 0,
  });

  return NextResponse.json({
    measure,
    risk: updatedRisk,
    ...compliance,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { id, status, is_mandatory, criticality, deadline, escalation_level, responsible } = body;

  const { data: existing } = await supabase.from("measures").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Maßnahme nicht gefunden" }, { status: 404 });

  const company = await verifyCompanyOwnership(user.id, existing.company_id);
  if (!company) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });

  const beforeData = await loadCompanyComplianceData(supabase, existing.company_id);
  const beforeStatus = calculateSecurityStatus(beforeData);

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (is_mandatory !== undefined) updates.is_mandatory = Boolean(is_mandatory);
  if (criticality !== undefined) updates.criticality = criticality;
  if (deadline !== undefined) updates.deadline = deadline || null;
  if (escalation_level !== undefined) updates.escalation_level = escalation_level;
  if (responsible !== undefined) updates.responsible = responsible;

  const { data: measure, error } = await supabase
    .from("measures")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

  if (Object.keys(updates).length > 0) {
    await logFieldChanges(supabase, {
      companyId: existing.company_id,
      userId: user.id,
      entityType: "measure",
      entityId: id,
      oldRow: existing as Record<string, unknown>,
      updates,
    });
  }

  const updatedRisk = await reconcileMeasureCompliance(supabase, id, existing.company_id);
  const measureRow = measure as Measure;
  const measureCompleted = status === "completed";

  const afterData = await loadCompanyComplianceData(supabase, existing.company_id);
  const hasOpenMandatoryMeasures = afterData.measures.some(
    (m) => m.is_mandatory && !isWorkComplete(m.status)
  );

  const eventTitle = measureCompleted
    ? `Maßnahme erledigt: ${measureRow.title}`
    : "Maßnahme aktualisiert";

  await supabase.from("compliance_events").insert({
    company_id: existing.company_id,
    event_type: measureCompleted ? "measure_completed" : "measure_updated",
    title: eventTitle,
    details: measureRow.title,
    risk_id: measureRow.risk_id ?? updatedRisk?.id ?? null,
    measure_id: measureRow.id,
  });

  const compliance = await buildComplianceResponse(supabase, existing.company_id, beforeStatus.score, {
    measureCompleted,
    missingEvidence:
      getMissingAuditDocumentTypes(afterData.documents, afterData.company).length > 0,
    hasOpenMandatoryMeasures,
  });

  return NextResponse.json({
    success: true,
    measure: measureRow,
    risk: updatedRisk,
    unlinkedRisk: !measureRow.risk_id && !updatedRisk,
    ...compliance,
  });
}
