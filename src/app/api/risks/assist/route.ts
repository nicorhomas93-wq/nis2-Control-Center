import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import {
  buildMeasureSuggestions,
  buildRiskAssistPrefill,
  calculateMeasureScoreImpact,
} from "@/lib/measures/risk-assist";
import { validateMeasureTitle } from "@/lib/measures/naming";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import type { Risk } from "@/lib/types";
import type { CompanyAsset } from "@/lib/assets/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const { data: assets } = await supabase
    .from("company_assets")
    .select("*")
    .eq("company_id", companyId);

  const riskRow = risk as Risk;
  const assetList = (assets ?? []) as CompanyAsset[];
  const suggestions = buildMeasureSuggestions(riskRow, assetList);
  const prefill = buildRiskAssistPrefill(riskRow, assetList);
  const scoreImpact = calculateMeasureScoreImpact(riskRow.risk_level);

  return NextResponse.json({
    suggestions,
    prefill,
    scoreImpact,
    risk: riskRow,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const {
    riskId,
    companyId,
    measureTitle,
    assetId,
    deadline,
    responsible,
    vulnerability,
    businessImpact,
    isMandatory,
    criticality,
    escalationLevel,
    action = "save",
  } = body;

  if (!riskId || !companyId || !measureTitle) {
    return NextResponse.json(
      { error: "riskId, companyId und measureTitle erforderlich" },
      { status: 400 }
    );
  }

  const validation = validateMeasureTitle(measureTitle);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.warning }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: risk } = await supabase.from("risks").select("*").eq("id", riskId).single();
  if (!risk) return NextResponse.json({ error: "Risiko nicht gefunden" }, { status: 404 });

  const riskUpdates: Record<string, unknown> = {
    measure: measureTitle,
    responsible: responsible || null,
    vulnerability: vulnerability ?? risk.vulnerability,
    business_impact: businessImpact ?? risk.business_impact,
    is_mandatory: Boolean(isMandatory),
    criticality: criticality ?? risk.criticality,
    deadline: deadline || null,
    escalation_level: escalationLevel ?? risk.escalation_level ?? 0,
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

  const { error: riskError } = await supabase
    .from("risks")
    .update(riskUpdates)
    .eq("id", riskId);

  if (riskError) {
    return NextResponse.json({ error: getDbErrorMessage(riskError) }, { status: 500 });
  }

  const measureStatus =
    action === "save_and_complete" ? "completed" : "open";

  const { data: measure, error: measureError } = await supabase
    .from("measures")
    .insert({
      company_id: companyId,
      title: measureTitle,
      description: `Abgeleitet aus Risiko: ${risk.threat}`,
      status: measureStatus,
      priority: risk.risk_level === "high" ? "high" : "medium",
      criticality: criticality ?? risk.criticality ?? "medium",
      responsible: responsible || null,
      target_state: "Maßnahme umgesetzt und im Audit-Ordner dokumentiert",
      is_mandatory: Boolean(isMandatory),
      deadline: deadline || null,
      asset_id: assetId || risk.asset_id || null,
      risk_id: riskId,
    })
    .select()
    .single();

  if (measureError) {
    return NextResponse.json(
      { error: getDbErrorMessage(measureError), missingTable: isMissingTableError(measureError) },
      { status: isMissingTableError(measureError) ? 503 : 500 }
    );
  }

  const eventTitle = `Maßnahme für Risiko „${risk.asset}“ definiert`;
  await supabase.from("compliance_events").insert({
    company_id: companyId,
    event_type: "risk_measure_defined",
    title: eventTitle,
    details: measureTitle,
    risk_id: riskId,
    measure_id: measure?.id ?? null,
  });

  await syncCompanySecurityScore(supabase, companyId);

  return NextResponse.json({
    success: true,
    measure,
    eventTitle,
    redirectTo:
      action === "upload_evidence"
        ? "/documents"
        : action === "save_and_task"
          ? "/measures"
          : null,
  });
}
