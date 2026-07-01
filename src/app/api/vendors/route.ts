import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  buildVendorDashboardStats,
  ensureVendorEvidenceRows,
  loadVendorsWithDetails,
} from "@/lib/vendors/service";
import type { VendorCriticality } from "@/lib/vendors/types";

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
    const stats = buildVendorDashboardStats(vendors);
    return NextResponse.json({ vendors, stats });
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
    contactName,
    contactEmail,
    website,
    description,
    criticality,
    notes,
    processesPersonalData,
    nextReviewAt,
  } = body;

  if (!companyId || !name) {
    return NextResponse.json({ error: "companyId und name erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: vendor, error } = await supabase
    .from("company_vendors")
    .insert({
      company_id: companyId,
      name: String(name).trim(),
      contact_name: contactName?.trim() || null,
      contact_email: contactEmail?.trim() || null,
      website: website?.trim() || null,
      description: description?.trim() || null,
      criticality: (criticality as VendorCriticality) ?? "medium",
      notes: notes?.trim() || null,
      processes_personal_data: Boolean(processesPersonalData),
      next_review_at: nextReviewAt ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  await ensureVendorEvidenceRows(supabase, companyId, vendor.id);

  const { data: evidence } = await supabase
    .from("vendor_evidence")
    .select("*")
    .eq("vendor_id", vendor.id);

  return NextResponse.json({ vendor, evidence: evidence ?? [] });
}
