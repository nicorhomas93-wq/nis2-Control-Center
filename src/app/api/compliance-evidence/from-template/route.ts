import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { logActivity } from "@/lib/activity/log";
import { getNis2EvidenceScope } from "@/lib/compliance-evidence/types";
import {
  getEvidenceTemplate,
  resolveTemplateMandatory,
} from "@/lib/compliance-evidence/templates";
import { computeNextReviewDate } from "@/lib/compliance-evidence/review-interval";
import { syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, templateKey, conductedAt } = body;

  if (!companyId || !templateKey) {
    return NextResponse.json({ error: "companyId und templateKey erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const template = getEvidenceTemplate(templateKey);
  if (!template) {
    return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
  }

  const scope = getNis2EvidenceScope(company);
  const mandatoryRelevance = resolveTemplateMandatory(template, scope);
  const conducted = conductedAt ?? new Date().toISOString().slice(0, 10);
  const nextReviewAt = computeNextReviewDate(template.reviewInterval, conducted);

  const { data: entry, error } = await supabase
    .from("compliance_evidence_entries")
    .insert({
      company_id: companyId,
      title: template.title,
      category: template.category,
      entry_type: template.entryType,
      description: template.description,
      conducted_at: conducted,
      mandatory_relevance: mandatoryRelevance,
      review_interval: template.reviewInterval,
      next_review_at: nextReviewAt,
      template_key: template.key,
      recommended_file_labels: template.recommendedFiles,
      status: scope === "voluntary" ? "freiwillig_empfohlen" : "nachweis_fehlt",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  await logActivity(supabase, {
    companyId,
    userId: user.id,
    action: "evidence_entry_created",
    entityType: "compliance_evidence",
    entityId: entry.id,
    comment: `Vorlage „${template.title}" angelegt`,
  });

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ entry: { ...entry, files: [] }, snapshot, template });
}
