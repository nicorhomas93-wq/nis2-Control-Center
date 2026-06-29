import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCompanyProfileComplete, verifyCompanyOwnership } from "@/lib/company";
import { calculateComplianceScore } from "@/lib/nis2/compliance-score";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  buildAuditSummaryPrompt,
  generateFallbackAuditSummary,
  generateWithAI,
} from "@/lib/ai/generate";
import {
  calculateAuditFolderScore,
  getAuditFolderStatuses,
} from "@/lib/audit/audit-folders";
import { AUDIT_STATUS_LABELS } from "@/lib/audit/audit-folder-quality";
import { buildStructuredAuditSummary } from "@/lib/audit/audit-summary";
import { buildComplianceSnapshot } from "@/lib/compliance/snapshot";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { companyId } = await request.json();
  if (!companyId) {
    return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) {
    return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });
  }

  if (!isCompanyProfileComplete(company)) {
    return NextResponse.json(
      {
        error: "Bitte zuerst Unternehmensprofil ausfüllen.",
        needsProfile: true,
      },
      { status: 400 }
    );
  }

  const [
    { data: assessments },
    { data: documents },
    { data: measures },
    { data: risks },
    { data: incidents },
  ] = await Promise.all([
    supabase
      .from("nis2_assessments")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("company_id", companyId),
    supabase.from("measures").select("*").eq("company_id", companyId),
    supabase.from("risks").select("*").eq("company_id", companyId),
    supabase.from("incidents").select("*").eq("company_id", companyId),
  ]);

  const docs = (documents ?? []) as Document[];
  const meas = (measures ?? []) as Measure[];
  const riskList = (risks ?? []) as Risk[];
  const incidentList = (incidents ?? []) as Incident[];
  const score = calculateComplianceScore(company, docs, meas);
  const auditScore = calculateAuditFolderScore(docs, company);
  const folderStatuses = getAuditFolderStatuses(docs, company);

  const companyWithScore: Company = { ...company, compliance_score: score };

  await supabase.from("companies").update({ compliance_score: score }).eq("id", companyId);

  const snapshot = buildComplianceSnapshot({
    company: companyWithScore,
    documents: docs,
    measures: meas,
    risks: riskList,
    incidents: incidentList,
  });

  const securityScore = snapshot.securityStatus.score;
  const auditReadiness = snapshot.securityStatus.auditReadiness;
  const nextSteps = snapshot.nextSteps.map((s) => s.title);

  const prompt = buildAuditSummaryPrompt(companyWithScore);
  const aiContent = await generateWithAI(prompt);
  const aiNarrative = aiContent ?? generateFallbackAuditSummary(companyWithScore);

  const summaryText = buildStructuredAuditSummary({
    company: companyWithScore,
    documents: docs,
    measures: meas,
    risks: riskList,
    aiNarrative,
    securityScore: snapshot.securityStatus.score,
    auditReadinessPercent: auditReadiness.percent,
    nextSteps,
  });

  const exportPayload = {
    generated_at: new Date().toISOString(),
    company: companyWithScore,
    summary: aiNarrative,
    summary_text: summaryText,
    audit_score: auditScore,
    security_score: securityScore,
    audit_readiness: auditReadiness,
    folder_statuses: folderStatuses.map((s) => ({
      folder_name: s.folderName,
      document_type: s.documentType,
      label: s.label,
      present: s.present,
      display_status: s.displayStatus,
      status_label: AUDIT_STATUS_LABELS[s.displayStatus],
      quality_score: s.quality.scorePercent,
      issues: s.quality.issues,
      version: s.document?.version ?? null,
      updated_at: s.document?.updated_at ?? null,
    })),
    "01_Betroffenheit": { status: company.nis2_status, assessments: assessments ?? [] },
    "02_Risikoanalyse": riskList,
    "03_Massnahmen": meas,
    "04_Dokumentation": docs,
    "05_Nachweise": { compliance_score: score, incidents: incidentList },
    documents: docs,
    measures: meas,
    risks: riskList,
    next_steps: nextSteps,
  };

  const { error } = await supabase.from("audit_exports").insert({
    company_id: companyId,
    export_data: exportPayload,
  });

  if (error && isMissingTableError(error)) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: true },
      { status: 503 }
    );
  }

  await syncCompanySecurityScore(supabase, companyId);

  return NextResponse.json({
    export: exportPayload,
    summary_text: summaryText,
    audit_score: auditScore,
    folder_statuses: folderStatuses,
    mode: aiContent ? "openai" : "demo",
  });
}
