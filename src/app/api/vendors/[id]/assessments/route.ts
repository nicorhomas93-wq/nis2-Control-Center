import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  evaluateVendor,
  nextReviewDate,
} from "@/lib/vendors/scoring";
import type {
  VendorCriticality,
  VendorEvidence,
  VendorQuestionnaireAnswers,
} from "@/lib/vendors/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vendorId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data, error } = await supabase
    .from("vendor_assessments")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("company_id", companyId)
    .order("version", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({ assessments: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vendorId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const {
    companyId,
    criticality,
    answers,
    notes,
    summary,
  } = body as {
    companyId: string;
    criticality?: VendorCriticality;
    answers: VendorQuestionnaireAnswers;
    notes?: string;
    summary?: string;
  };

  if (!companyId || !answers) {
    return NextResponse.json({ error: "companyId und answers erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: vendor, error: vendorError } = await supabase
    .from("company_vendors")
    .select("*")
    .eq("id", vendorId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (vendorError || !vendor) {
    return NextResponse.json({ error: "Lieferant nicht gefunden" }, { status: 404 });
  }

  const { data: evidenceRows } = await supabase
    .from("vendor_evidence")
    .select("*")
    .eq("vendor_id", vendorId);

  const evidence = (evidenceRows ?? []) as VendorEvidence[];
  const effectiveCriticality = (criticality ?? vendor.criticality) as VendorCriticality;
  const result = evaluateVendor({
    criticality: effectiveCriticality,
    evidence,
    answers,
    providerKey: vendor.provider_key,
  });

  const evidenceSnapshot = Object.fromEntries(
    evidence.map((e) => [e.evidence_type, e.status])
  );

  const { data: lastVersionRow } = await supabase
    .from("vendor_assessments")
    .select("version")
    .eq("vendor_id", vendorId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (lastVersionRow?.version ?? 0) + 1;
  const assessedAt = new Date().toISOString();
  const reviewAt = nextReviewDate(effectiveCriticality).toISOString();

  const { data: assessment, error: assessmentError } = await supabase
    .from("vendor_assessments")
    .insert({
      vendor_id: vendorId,
      company_id: companyId,
      version,
      assessed_at: assessedAt,
      assessed_by: user.id,
      criticality: effectiveCriticality,
      risk_level: result.riskLevel,
      vendor_score: result.vendorScore,
      questionnaire_score: result.questionnaireScore,
      evidence_score: result.evidenceScore,
      questionnaire_answers: answers,
      evidence_snapshot: evidenceSnapshot,
      summary: summary?.trim() || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (assessmentError) {
    return NextResponse.json(
      { error: getDbErrorMessage(assessmentError), missingTable: isMissingTableError(assessmentError) },
      { status: isMissingTableError(assessmentError) ? 503 : 500 }
    );
  }

  const { data: updatedVendor, error: updateError } = await supabase
    .from("company_vendors")
    .update({
      criticality: effectiveCriticality,
      risk_level: result.riskLevel,
      vendor_score: result.vendorScore,
      processes_personal_data: result.processesPersonalData,
      last_assessed_at: assessedAt,
      next_review_at: reviewAt,
    })
    .eq("id", vendorId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: getDbErrorMessage(updateError), missingTable: isMissingTableError(updateError) },
      { status: isMissingTableError(updateError) ? 503 : 500 }
    );
  }

  return NextResponse.json({ assessment, vendor: updatedVendor, result });
}
