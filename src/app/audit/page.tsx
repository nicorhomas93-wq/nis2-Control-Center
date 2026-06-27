import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuditPageClient } from "@/components/audit/AuditPageClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany, isCompanyProfileComplete } from "@/lib/company";
import type { Document, Measure, Risk } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);
  if (!company && !missingTable) redirect("/login");

  let documents: Document[] = [];
  let measures: Measure[] = [];
  let risks: Risk[] = [];

  if (company) {
    const [docsRes, measuresRes, risksRes] = await Promise.all([
      supabase
        .from("documents")
        .select("*")
        .eq("company_id", company.id)
        .order("updated_at", { ascending: false }),
      supabase.from("measures").select("*").eq("company_id", company.id),
      supabase.from("risks").select("*").eq("company_id", company.id),
    ]);

    documents = (docsRes.data ?? []).map((d) => ({
      ...(d as Document),
      version: (d as Document).version ?? 1,
    }));
    measures = (measuresRes.data ?? []) as Measure[];
    risks = (risksRes.data ?? []) as Risk[];
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Audit-Ordner</h1>
        <p className="mt-1 text-slate-500">
          Prüfungstaugliches Export-Paket mit Dokumentstatus und ZIP-Export vorbereiten.
        </p>
      </div>
      {company && (
        <AuditPageClient
          companyId={company.id}
          companyName={company.company_name ?? undefined}
          nis2Status={company.nis2_status}
          complianceScore={company.compliance_score ?? 0}
          profileComplete={isCompanyProfileComplete(company)}
          initialDocuments={documents}
          initialMeasures={measures}
          initialRisks={risks}
        />
      )}
    </DashboardShell>
  );
}
