import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerApiAccess } from "@/lib/owner/require-api-access";
import { activeOnly } from "@/lib/supabase/soft-delete";

export async function GET(request: Request) {
  const access = await requireOwnerApiAccess();
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  const supabase = await createClient();

  const companiesQuery = activeOnly(
    supabase
      .from("companies")
      .select("id, company_name, is_mandant, is_demo, created_at")
      .eq("user_id", access.userId)
      .order("company_name")
  );

  const { data: companies, error: companiesError } = await companiesQuery;
  if (companiesError) {
    return NextResponse.json({ error: companiesError.message }, { status: 500 });
  }

  if (!companyId) {
    return NextResponse.json({ companies: companies ?? [] });
  }

  const owned = (companies ?? []).some((c) => c.id === companyId);
  if (!owned) {
    return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });
  }

  const [risks, measures, documents, incidents, auditExports] = await Promise.all([
    activeOnly(supabase.from("risks").select("id, asset, threat, risk_level, created_at").eq("company_id", companyId)),
    activeOnly(supabase.from("measures").select("id, title, status, created_at").eq("company_id", companyId)),
    activeOnly(supabase.from("documents").select("id, title, document_type, created_at").eq("company_id", companyId)),
    activeOnly(supabase.from("incidents").select("id, title, status, created_at").eq("company_id", companyId)),
    activeOnly(supabase.from("audit_exports").select("id, created_at").eq("company_id", companyId)),
  ]);

  return NextResponse.json({
    companies: companies ?? [],
    risks: risks.data ?? [],
    measures: measures.data ?? [],
    documents: documents.data ?? [],
    incidents: incidents.data ?? [],
    auditExports: auditExports.data ?? [],
  });
}
