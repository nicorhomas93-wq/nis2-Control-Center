import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { deriveEntryStatus } from "@/lib/compliance-evidence/scoring";
import type {
  EvidenceCategory,
  EvidenceEntryStatus,
  EvidenceEntryType,
  EvidenceMandatoryRelevance,
} from "@/lib/compliance-evidence/types";
import { syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, ...fields } = body;
  if (!companyId) {
    return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (fields.title !== undefined) updates.title = String(fields.title).trim();
  if (fields.category !== undefined) updates.category = fields.category as EvidenceCategory;
  if (fields.entryType !== undefined) updates.entry_type = fields.entryType as EvidenceEntryType;
  if (fields.description !== undefined) updates.description = fields.description?.trim() || null;
  if (fields.conductedAt !== undefined) updates.conducted_at = fields.conductedAt || null;
  if (fields.responsible !== undefined) updates.responsible = fields.responsible?.trim() || null;
  if (fields.validUntil !== undefined) updates.valid_until = fields.validUntil || null;
  if (fields.nextReviewAt !== undefined) updates.next_review_at = fields.nextReviewAt || null;
  if (fields.mandatoryRelevance !== undefined) {
    updates.mandatory_relevance = fields.mandatoryRelevance as EvidenceMandatoryRelevance;
  }
  if (fields.externalLinks !== undefined) updates.external_links = fields.externalLinks;
  if (fields.linkedRiskIds !== undefined) updates.linked_risk_ids = fields.linkedRiskIds;
  if (fields.linkedMeasureIds !== undefined) updates.linked_measure_ids = fields.linkedMeasureIds;
  if (fields.linkedTaskIds !== undefined) updates.linked_task_ids = fields.linkedTaskIds;
  if (fields.linkedVendorIds !== undefined) updates.linked_vendor_ids = fields.linkedVendorIds;
  if (fields.linkedAuditAreas !== undefined) updates.linked_audit_areas = fields.linkedAuditAreas;
  if (fields.status !== undefined) updates.status = fields.status as EvidenceEntryStatus;

  const { data: entry, error } = await supabase
    .from("compliance_evidence_entries")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  const { data: files } = await supabase
    .from("compliance_evidence_files")
    .select("*")
    .eq("entry_id", id)
    .eq("is_current", true);

  const computedStatus = deriveEntryStatus(
    entry,
    (files ?? []) as import("@/lib/compliance-evidence/types").ComplianceEvidenceFile[],
    company
  );

  if (computedStatus !== entry.status) {
    await supabase
      .from("compliance_evidence_entries")
      .update({ status: computedStatus })
      .eq("id", id);
  }

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ entry: { ...entry, status: computedStatus }, snapshot });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { error } = await supabase
    .from("compliance_evidence_entries")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ ok: true, snapshot });
}
