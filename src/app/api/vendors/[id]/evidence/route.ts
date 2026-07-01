import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import type { VendorEvidenceStatus, VendorEvidenceType } from "@/lib/vendors/types";

export async function PATCH(
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
  const { companyId, evidence } = body as {
    companyId: string;
    evidence: Array<{
      id?: string;
      evidenceType: VendorEvidenceType;
      status: VendorEvidenceStatus;
      validUntil?: string | null;
      reviewedAt?: string | null;
      fileName?: string | null;
      fileUrl?: string | null;
      notes?: string | null;
    }>;
  };

  if (!companyId || !Array.isArray(evidence)) {
    return NextResponse.json({ error: "companyId und evidence erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  for (const item of evidence) {
    const payload = {
      status: item.status,
      valid_until: item.validUntil ?? null,
      reviewed_at: item.reviewedAt ?? null,
      file_name: item.fileName?.trim() || null,
      file_url: item.fileUrl?.trim() || null,
      notes: item.notes?.trim() || null,
    };

    if (item.id) {
      const { error } = await supabase
        .from("vendor_evidence")
        .update(payload)
        .eq("id", item.id)
        .eq("vendor_id", vendorId)
        .eq("company_id", companyId);
      if (error) {
        return NextResponse.json(
          { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
          { status: isMissingTableError(error) ? 503 : 500 }
        );
      }
    } else {
      const { error } = await supabase.from("vendor_evidence").upsert(
        {
          vendor_id: vendorId,
          company_id: companyId,
          evidence_type: item.evidenceType,
          ...payload,
        },
        { onConflict: "vendor_id,evidence_type" }
      );
      if (error) {
        return NextResponse.json(
          { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
          { status: isMissingTableError(error) ? 503 : 500 }
        );
      }
    }
  }

  const { data } = await supabase
    .from("vendor_evidence")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("evidence_type");

  return NextResponse.json({ evidence: data ?? [] });
}
