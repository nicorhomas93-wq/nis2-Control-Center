import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { loadCompanyComplianceData, syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";
import { reconcileRiskTreatment } from "@/lib/compliance/measure-risk-link";
import { calculateSecurityStatus } from "@/lib/compliance/security-status";
import { buildScoreFeedbackMessage } from "@/lib/compliance/score-feedback";
import { getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import { isWorkComplete } from "@/lib/compliance/obligations";
import {
  buildMeasureSuggestions,
  buildRiskAssistPrefill,
  calculateMeasureScoreImpact,
} from "@/lib/measures/risk-assist";
import { validateMeasureTitle } from "@/lib/measures/naming";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import type { Measure, Risk, RiskLevel } from "@/lib/types";
import type { CompanyAsset } from "@/lib/assets/types";

function normalizeWorkflowStatus(
  value: string | undefined,
  riskLevel: RiskLevel
): "open" | "in_progress" | "completed" {
  if (value === "completed" || value === "in_progress" || value === "open") return value;
  return riskLevel === "low" ? "completed" : "open";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const riskId = searchParams.get("riskId");
  const companyId = searchParams.get("companyId");

  if (!riskId || !companyId) {
    return NextResponse.json({ error: "riskId und companyId erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: risk } = await supabase.from("risks").select("*").eq("id", riskId).single();
  if (!risk) return NextResponse.json({ error: "Risiko nicht gefunden" }, { status: 404 });

  const [{ data: assets }, { data: linkedMeasures }] = await Promise.all([
    supabase.from("company_assets").select("*").eq("company_id", companyId),
    supabase
      .from("measures")
      .select("id, title, status")
      .eq("risk_id", riskId)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  const riskRow = risk as Risk;
  const assetList = (assets ?? []) as CompanyAsset[];
  const linkedMeasure = (linkedMeasures?.[0] as Pick<Measure, "id" | "title" | "status"> | undefined) ?? null;
  const suggestions = buildMeasureSuggestions(riskRow, assetList);
  const prefill = buildRiskAssistPrefill(riskRow, assetList, linkedMeasure);
  const scoreImpact = calculateMeasureScoreImpact(prefill.riskLevel);

  return NextResponse.json({
    suggestions,
    prefill,
    scoreImpact,
    risk: riskRow,
    linkedMeasure,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const {
    riskId,
    companyId,
    threat,
    riskLevel,
    measureTitle,
    measureId,
    assetId,
    deadline,
    responsible,
    vulnerability,
    businessImpact,
    isMandatory,
    criticality,
    workflowStatus,
    action = "save",
  } = body;

  if (!riskId || !companyId) {
    return NextResponse.json({ error: "riskId und companyId erforderlich" }, { status: 400 });
  }

  const trimmedMeasure = typeof measureTitle === "string" ? measureTitle.trim() : "";
  if (!trimmedMeasure) {
    return NextResponse.json({ error: "Bitte eine Maßnahme angeben." }, { status: 400 });
  }

  const validation = validateMeasureTitle(trimmedMeasure);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.warning }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const beforeData = await loadCompanyComplianceData(supabase, companyId);
  const beforeStatus = calculateSecurityStatus(beforeData);

  const { data: risk } = await supabase.from("risks").select("*").eq("id", riskId).single();
  if (!risk) return NextResponse.json({ error: "Risiko nicht gefunden" }, { status: 404 });

  const nextRiskLevel = (riskLevel ?? risk.risk_level) as RiskLevel;
  const measureStatus =
    action === "save_and_complete"
      ? "completed"
      : normalizeWorkflowStatus(workflowStatus, nextRiskLevel);

  const riskUpdates: Record<string, unknown> = {
    threat: threat?.trim() || risk.threat,
    risk_level: nextRiskLevel,
    measure: trimmedMeasure,
    responsible: responsible?.trim() || null,
    vulnerability: vulnerability ?? risk.vulnerability,
    business_impact: businessImpact ?? risk.business_impact,
    is_mandatory: Boolean(isMandatory),
    criticality: criticality ?? risk.criticality,
    deadline: deadline || null,
  };

  if (assetId) {
    riskUpdates.asset_id = assetId;
    const { data: asset } = await supabase
      .from("company_assets")
      .select("name")
      .eq("id", assetId)
      .single();
    if (asset?.name) riskUpdates.asset = asset.name;
  }

  const { data: updatedRisk, error: riskError } = await supabase
    .from("risks")
    .update(riskUpdates)
    .eq("id", riskId)
    .select()
    .single();

  if (riskError) {
    return NextResponse.json({ error: getDbErrorMessage(riskError) }, { status: 500 });
  }

  const measurePayload = {
    title: trimmedMeasure,
    description: `Abgeleitet aus Risiko: ${updatedRisk?.threat ?? risk.threat}`,
    status: measureStatus,
    priority: nextRiskLevel === "high" ? "high" : "medium",
    criticality: criticality ?? risk.criticality ?? "medium",
    responsible: responsible?.trim() || null,
    target_state: "Maßnahme umgesetzt und im Audit-Ordner dokumentiert",
    is_mandatory: Boolean(isMandatory),
    deadline: deadline || null,
    asset_id: assetId || risk.asset_id || null,
    risk_id: riskId,
  };

  let measure: Measure | null = null;
  let measureError = null;

  if (measureId) {
    const result = await supabase
      .from("measures")
      .update(measurePayload)
      .eq("id", measureId)
      .eq("company_id", companyId)
      .select()
      .single();
    measure = (result.data as Measure | null) ?? null;
    measureError = result.error;
  }

  if (!measure) {
    const { data: existing } = await supabase
      .from("measures")
      .select("id")
      .eq("risk_id", riskId)
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const result = await supabase
        .from("measures")
        .update(measurePayload)
        .eq("id", existing.id)
        .select()
        .single();
      measure = (result.data as Measure | null) ?? null;
      measureError = result.error;
    } else {
      const result = await supabase
        .from("measures")
        .insert({ company_id: companyId, ...measurePayload })
        .select()
        .single();
      measure = (result.data as Measure | null) ?? null;
      measureError = result.error;
    }
  }

  if (measureError) {
    return NextResponse.json(
      {
        error: getDbErrorMessage(measureError),
        missingTable: isMissingTableError(measureError),
      },
      { status: isMissingTableError(measureError) ? 503 : 500 }
    );
  }

  const assetLabel = updatedRisk?.asset ?? risk.asset ?? "Risiko";
  const eventTitle =
    action === "save_and_complete"
      ? `Maßnahme für Risiko „${assetLabel}“ erledigt`
      : action === "save_and_task"
        ? `Maßnahme für Risiko „${assetLabel}“ zur Aufgabenliste hinzugefügt`
        : "Risiko wurde aktualisiert";

  const eventType =
    action === "save_and_complete"
      ? "risk_measure_completed"
      : action === "save_and_task"
        ? "risk_measure_task"
        : "risk_updated";

  await supabase.from("compliance_events").insert({
    company_id: companyId,
    event_type: eventType,
    title: eventTitle,
    details: trimmedMeasure,
    risk_id: riskId,
    measure_id: measure?.id ?? null,
  });

  const reconciledRisk = await reconcileRiskTreatment(supabase, riskId);
  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  const scoreDelta = snapshot.securityStatus.score - beforeStatus.score;
  const measureCompleted =
    measureStatus === "completed" || action === "save_and_complete";
  const afterData = await loadCompanyComplianceData(supabase, companyId);
  const hasOpenMandatoryMeasures = afterData.measures.some(
    (m) => m.is_mandatory && !isWorkComplete(m.status)
  );

  return NextResponse.json({
    success: true,
    risk: reconciledRisk ?? updatedRisk,
    measure,
    eventTitle,
    securityStatus: snapshot.securityStatus,
    nextSteps: snapshot.nextSteps,
    scoreDelta,
    feedbackMessage: buildScoreFeedbackMessage(scoreDelta, {
      measureCompleted,
      missingEvidence:
        getMissingAuditDocumentTypes(afterData.documents, afterData.company).length > 0,
      hasOpenMandatoryMeasures,
    }),
    redirectTo:
      action === "upload_evidence"
        ? "/documents"
        : action === "save_and_task"
          ? "/measures"
          : null,
  });
}
