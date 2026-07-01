import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { saveGeneratedDocument } from "@/lib/documents/save-document";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import { buildVendorAuditDocumentContent } from "@/lib/vendors/audit-export";
import { loadVendorsWithDetails } from "@/lib/vendors/service";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import type { Document } from "@/lib/types";

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
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const vendors = await loadVendorsWithDetails(supabase, companyId);
  const content = buildVendorAuditDocumentContent(
    company.company_name ?? "Unternehmen",
    vendors
  );
  const typeLabel = getDocumentTypeLabel("lieferantenbewertung");

  const { data: existing } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("document_type", "lieferantenbewertung")
    .maybeSingle();

  const result = await saveGeneratedDocument(supabase, {
    companyId,
    documentType: "lieferantenbewertung",
    typeLabel,
    content,
    mode: "demo",
    existing: (existing as Document) ?? null,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message, missingTable: result.error.missingTable },
      { status: result.error.missingTable ? 503 : 500 }
    );
  }

  await syncCompanySecurityScore(supabase, companyId);

  return NextResponse.json({
    document: result.document,
    vendorCount: vendors.length,
    folder: "08_Lieferantenbewertung",
  });
}
