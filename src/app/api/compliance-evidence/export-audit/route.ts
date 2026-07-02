import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { loadComplianceEvidenceEntries } from "@/lib/compliance-evidence/service";
import { buildComplianceEvidenceAuditExport } from "@/lib/compliance-evidence/audit-export";
import { logActivity } from "@/lib/activity/log";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId } = body;
  if (!companyId) {
    return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const entries = await loadComplianceEvidenceEntries(supabase, companyId);
  const content = buildComplianceEvidenceAuditExport(
    company.company_name ?? "Unternehmen",
    company,
    entries
  );

  await logActivity(supabase, {
    companyId,
    userId: user.id,
    action: "evidence_audit_export",
    entityType: "compliance_evidence",
    entityId: companyId,
    comment: `Audit-Export (${entries.length} Einträge)`,
  });

  return NextResponse.json({
    content,
    fileName: `Schulungen_Nachweise_Audit_${new Date().toISOString().slice(0, 10)}.md`,
    entryCount: entries.length,
  });
}
