import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { saveGeneratedDocument } from "@/lib/documents/save-document";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { buildVendorNaAuditDocumentContent } from "@/lib/vendors/applicability";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import type { VendorApplicability } from "@/lib/vendors/types";
import type { Document } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, applicability } = body as {
    companyId: string;
    applicability: VendorApplicability;
  };

  if (!companyId || !applicability) {
    return NextResponse.json(
      { error: "companyId und applicability erforderlich" },
      { status: 400 }
    );
  }

  if (!["yes", "no", "unknown"].includes(applicability)) {
    return NextResponse.json({ error: "Ungültige Antwort" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: updated, error } = await supabase
    .from("companies")
    .update({ vendors_applicability: applicability })
    .eq("id", companyId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  let naDocument: Document | null = null;
  if (applicability === "no") {
    const content = buildVendorNaAuditDocumentContent(
      company.company_name ?? "Unternehmen"
    );
    const typeLabel = getDocumentTypeLabel("lieferantenbewertung");
    const { data: existing } = await supabase
      .from("documents")
      .select("*")
      .eq("company_id", companyId)
      .eq("document_type", "lieferantenbewertung")
      .maybeSingle();

    const saved = await saveGeneratedDocument(supabase, {
      companyId,
      documentType: "lieferantenbewertung",
      typeLabel,
      content,
      mode: "demo",
      existing: (existing as Document) ?? null,
    });
    naDocument = saved.document;
  }

  return NextResponse.json({
    company: updated,
    applicability,
    naDocument,
  });
}
