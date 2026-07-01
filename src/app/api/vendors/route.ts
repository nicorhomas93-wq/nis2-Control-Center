import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  buildVendorDashboardStats,
  ensureVendorEvidenceRows,
  loadVendorsWithDetails,
} from "@/lib/vendors/service";
import { getVendorApplicability } from "@/lib/vendors/applicability";
import {
  getProviderDefaults,
  matchKnownProviderByName,
} from "@/lib/vendors/provider-catalog";
import { nextReviewDate } from "@/lib/vendors/scoring";
import type { VendorApplicability, VendorCategory, VendorCriticality } from "@/lib/vendors/types";

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
    const vendors = await loadVendorsWithDetails(supabase, companyId);
    const applicability = getVendorApplicability(company);
    const stats = buildVendorDashboardStats(vendors, applicability);
    return NextResponse.json({ vendors, stats, applicability });
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
    name,
    providerKey,
    category,
    contactName,
    contactEmail,
    website,
    description,
    criticality,
    status,
    notes,
    processesPersonalData,
    nextReviewAt,
  } = body;

  if (!companyId || !name) {
    return NextResponse.json({ error: "companyId und name erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const knownByName = matchKnownProviderByName(String(name));
  const effectiveProviderKey =
    providerKey && providerKey !== "custom"
      ? providerKey
      : knownByName?.key ?? null;
  const providerDefaults = getProviderDefaults(effectiveProviderKey);

  const effectiveCriticality =
    (criticality as VendorCriticality) ??
    providerDefaults?.criticality ??
    "medium";
  const effectiveCategory =
    (category as VendorCategory) ?? providerDefaults?.category ?? "sonstiger";
  const effectiveWebsite = website?.trim() || providerDefaults?.website || null;
  const reviewAt =
    nextReviewAt ?? nextReviewDate(effectiveCriticality).toISOString();

  const { data: vendor, error } = await supabase
    .from("company_vendors")
    .insert({
      company_id: companyId,
      name: String(name).trim(),
      provider_key: effectiveProviderKey || null,
      category: effectiveCategory,
      contact_name: contactName?.trim() || null,
      contact_email: contactEmail?.trim() || null,
      website: effectiveWebsite,
      description: description?.trim() || null,
      criticality: effectiveCriticality,
      status: status ?? "active",
      notes: notes?.trim() || null,
      processes_personal_data:
        processesPersonalData ??
        providerDefaults?.questionnaire.processes_personal_data === "yes",
      next_review_at: reviewAt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  await ensureVendorEvidenceRows(supabase, companyId, vendor.id, effectiveProviderKey);

  const { data: evidence } = await supabase
    .from("vendor_evidence")
    .select("*")
    .eq("vendor_id", vendor.id);

  return NextResponse.json({
    vendor,
    evidence: evidence ?? [],
    providerDefaults: providerDefaults
      ? {
          questionnaire: providerDefaults.questionnaire,
          recommendedEvidence: providerDefaults.recommendedEvidence,
          riskAdvisory: providerDefaults.riskAdvisory,
        }
      : null,
  });
}
