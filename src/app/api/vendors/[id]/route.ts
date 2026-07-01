import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import type { VendorCriticality, VendorStatus } from "@/lib/vendors/types";

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
  if (fields.name !== undefined) updates.name = String(fields.name).trim();
  if (fields.contactName !== undefined) updates.contact_name = fields.contactName?.trim() || null;
  if (fields.contactEmail !== undefined) updates.contact_email = fields.contactEmail?.trim() || null;
  if (fields.website !== undefined) updates.website = fields.website?.trim() || null;
  if (fields.description !== undefined) updates.description = fields.description?.trim() || null;
  if (fields.criticality !== undefined) updates.criticality = fields.criticality as VendorCriticality;
  if (fields.notes !== undefined) updates.notes = fields.notes?.trim() || null;
  if (fields.status !== undefined) updates.status = fields.status as VendorStatus;
  if (fields.processesPersonalData !== undefined) {
    updates.processes_personal_data = Boolean(fields.processesPersonalData);
  }
  if (fields.nextReviewAt !== undefined) updates.next_review_at = fields.nextReviewAt;
  if (fields.riskLevel !== undefined) updates.risk_level = fields.riskLevel;
  if (fields.vendorScore !== undefined) updates.vendor_score = fields.vendorScore;
  if (fields.lastAssessedAt !== undefined) updates.last_assessed_at = fields.lastAssessedAt;

  const { data, error } = await supabase
    .from("company_vendors")
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

  return NextResponse.json({ vendor: data });
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
    .from("company_vendors")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      deletion_reason: "deleted_by_user",
      status: "inactive",
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
