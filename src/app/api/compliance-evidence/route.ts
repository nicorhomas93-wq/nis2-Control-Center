import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  loadComplianceEvidenceEntries,
} from "@/lib/compliance-evidence/service";
import { buildEvidenceDashboardStats } from "@/lib/compliance-evidence/scoring";
import { deriveEntryStatus } from "@/lib/compliance-evidence/scoring";
import { getNis2EvidenceScope, getNis2EvidenceScopeLabel } from "@/lib/compliance-evidence/types";
import type {
  EvidenceCategory,
  EvidenceEntryType,
  EvidenceMandatoryRelevance,
} from "@/lib/compliance-evidence/types";
import { syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";
import { logActivity } from "@/lib/activity/log";
import type { ReviewInterval } from "@/lib/compliance-evidence/review-interval";
import { computeNextReviewDate } from "@/lib/compliance-evidence/review-interval";

export async function GET(request: Request) {
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

  try {
    const entries = await loadComplianceEvidenceEntries(supabase, companyId);
    const stats = buildEvidenceDashboardStats(entries, company);
    const scope = getNis2EvidenceScope(company);

    const entriesWithStatus = entries.map((entry) => ({
      ...entry,
      computedStatus: deriveEntryStatus(entry, entry.files, company),
    }));

    return NextResponse.json({
      entries: entriesWithStatus,
      stats,
      scope,
      scopeLabel: getNis2EvidenceScopeLabel(scope),
      nis2Status: company.nis2_status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Laden fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const {
    companyId,
    title,
    category,
    entryType,
    description,
    conductedAt,
    responsible,
    participantsTarget,
    department,
    participantCount,
    validUntil,
    nextReviewAt,
    reviewInterval,
    mandatoryRelevance,
    externalLinks,
    linkedRiskIds,
    linkedMeasureIds,
    linkedTaskIds,
    linkedIncidentIds,
    linkedVendorIds,
    linkedAuditAreas,
    status,
    templateKey,
    recommendedFileLabels,
  } = body;

  if (!companyId || !title) {
    return NextResponse.json({ error: "companyId und title erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const effectiveReviewInterval = (reviewInterval as ReviewInterval) ?? "none";
  const effectiveConductedAt = conductedAt || null;
  const computedNextReview =
    nextReviewAt ??
    computeNextReviewDate(effectiveReviewInterval, effectiveConductedAt, nextReviewAt);

  const { data: entry, error } = await supabase
    .from("compliance_evidence_entries")
    .insert({
      company_id: companyId,
      title: String(title).trim(),
      category: (category as EvidenceCategory) ?? "sonstige",
      entry_type: (entryType as EvidenceEntryType) ?? "sonstiges",
      description: description?.trim() || null,
      conducted_at: effectiveConductedAt,
      responsible: responsible?.trim() || null,
      participants_target: participantsTarget?.trim() || null,
      department: department?.trim() || null,
      participant_count: participantCount ?? null,
      valid_until: validUntil || null,
      next_review_at: computedNextReview,
      review_interval: effectiveReviewInterval,
      mandatory_relevance: (mandatoryRelevance as EvidenceMandatoryRelevance) ?? "nis2_dependent",
      external_links: externalLinks ?? [],
      linked_risk_ids: linkedRiskIds ?? [],
      linked_measure_ids: linkedMeasureIds ?? [],
      linked_task_ids: linkedTaskIds ?? [],
      linked_incident_ids: linkedIncidentIds ?? [],
      linked_vendor_ids: linkedVendorIds ?? [],
      linked_audit_areas: linkedAuditAreas ?? [],
      template_key: templateKey ?? null,
      recommended_file_labels: recommendedFileLabels ?? [],
      status: status ?? "nachweis_fehlt",
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
    comment: `Eintrag „${entry.title}" angelegt`,
  });

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ entry: { ...entry, files: [] }, snapshot });
}
