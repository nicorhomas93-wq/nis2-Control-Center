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
    validUntil,
    nextReviewAt,
    mandatoryRelevance,
    externalLinks,
    linkedRiskIds,
    linkedMeasureIds,
    linkedTaskIds,
    linkedVendorIds,
    linkedAuditAreas,
    status,
  } = body;

  if (!companyId || !title) {
    return NextResponse.json({ error: "companyId und title erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: entry, error } = await supabase
    .from("compliance_evidence_entries")
    .insert({
      company_id: companyId,
      title: String(title).trim(),
      category: (category as EvidenceCategory) ?? "sonstige",
      entry_type: (entryType as EvidenceEntryType) ?? "sonstiges",
      description: description?.trim() || null,
      conducted_at: conductedAt || null,
      responsible: responsible?.trim() || null,
      valid_until: validUntil || null,
      next_review_at: nextReviewAt || null,
      mandatory_relevance: (mandatoryRelevance as EvidenceMandatoryRelevance) ?? "nis2_dependent",
      external_links: externalLinks ?? [],
      linked_risk_ids: linkedRiskIds ?? [],
      linked_measure_ids: linkedMeasureIds ?? [],
      linked_task_ids: linkedTaskIds ?? [],
      linked_vendor_ids: linkedVendorIds ?? [],
      linked_audit_areas: linkedAuditAreas ?? [],
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

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ entry: { ...entry, files: [] }, snapshot });
}
