import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompanyVendor,
  VendorApplicability,
  VendorAssessment,
  VendorDashboardStats,
  VendorEvidence,
  VendorWithDetails,
} from "@/lib/vendors/types";
import { VENDOR_EVIDENCE_TYPES } from "@/lib/vendors/evidence-types";
import { getRecommendedEvidenceTypes } from "@/lib/vendors/provider-catalog";
import {
  countMissingEvidence,
  isReviewDue,
} from "@/lib/vendors/scoring";
import { isVendorsNotApplicable } from "@/lib/vendors/applicability";

export async function ensureVendorEvidenceRows(
  supabase: SupabaseClient,
  companyId: string,
  vendorId: string,
  providerKey?: string | null
): Promise<void> {
  const { data: existing } = await supabase
    .from("vendor_evidence")
    .select("evidence_type")
    .eq("vendor_id", vendorId);

  const have = new Set((existing ?? []).map((r) => r.evidence_type));
  const missing = VENDOR_EVIDENCE_TYPES.filter((t) => !have.has(t));

  if (missing.length === 0) return;

  const recommended = new Set(getRecommendedEvidenceTypes(providerKey));

  await supabase.from("vendor_evidence").insert(
    missing.map((evidence_type) => ({
      vendor_id: vendorId,
      company_id: companyId,
      evidence_type,
      status:
        providerKey && recommended.size > 0 && !recommended.has(evidence_type)
          ? "not_applicable"
          : "not_fulfilled",
    }))
  );
}

export async function loadVendorsWithDetails(
  supabase: SupabaseClient,
  companyId: string
): Promise<VendorWithDetails[]> {
  const { data: vendors } = await supabase
    .from("company_vendors")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name");

  if (!vendors?.length) return [];

  const vendorIds = vendors.map((v) => v.id);

  const [{ data: evidence }, { data: assessments }] = await Promise.all([
    supabase.from("vendor_evidence").select("*").in("vendor_id", vendorIds),
    supabase
      .from("vendor_assessments")
      .select("*")
      .in("vendor_id", vendorIds)
      .order("version", { ascending: false }),
  ]);

  const evidenceByVendor = new Map<string, VendorEvidence[]>();
  for (const row of evidence ?? []) {
    const list = evidenceByVendor.get(row.vendor_id) ?? [];
    list.push(row as VendorEvidence);
    evidenceByVendor.set(row.vendor_id, list);
  }

  const assessmentsByVendor = new Map<string, VendorAssessment[]>();
  for (const row of assessments ?? []) {
    const list = assessmentsByVendor.get(row.vendor_id) ?? [];
    list.push(row as VendorAssessment);
    assessmentsByVendor.set(row.vendor_id, list);
  }

  return (vendors as CompanyVendor[]).map((vendor) => ({
    ...vendor,
    evidence: evidenceByVendor.get(vendor.id) ?? [],
    assessments: assessmentsByVendor.get(vendor.id) ?? [],
  }));
}

export function buildVendorDashboardStats(
  vendors: VendorWithDetails[],
  applicability: VendorApplicability = "unknown"
): VendorDashboardStats {
  if (isVendorsNotApplicable({ vendors_applicability: applicability })) {
    return {
      totalVendors: 0,
      criticalVendors: 0,
      missingEvidenceCount: 0,
      reviewsDueCount: 0,
      averageScore: 100,
      applicability,
      notApplicable: true,
    };
  }

  let missingEvidenceCount = 0;
  let reviewsDueCount = 0;
  let scoreSum = 0;

  for (const vendor of vendors) {
    missingEvidenceCount += countMissingEvidence(
      vendor.evidence,
      vendor.criticality,
      vendor.provider_key
    );
    if (isReviewDue(vendor.next_review_at)) reviewsDueCount += 1;
    scoreSum += vendor.vendor_score;
  }

  return {
    totalVendors: vendors.length,
    criticalVendors: vendors.filter(
      (v) => v.criticality === "critical" || v.criticality === "high"
    ).length,
    missingEvidenceCount,
    reviewsDueCount,
    averageScore:
      vendors.length > 0 ? Math.round(scoreSum / vendors.length) : 0,
    applicability,
    notApplicable: false,
  };
}
