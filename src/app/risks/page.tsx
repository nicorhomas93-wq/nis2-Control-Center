import { DashboardShell } from "@/components/layout/DashboardShell";
import { RisksPageClient } from "@/components/risks/RisksPageClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import { ensureSuggestedAssets } from "@/lib/assets/sync";
import type { CompanyAsset, Measure, Risk } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function RisksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);
  if (!company && !missingTable) redirect("/login");

  let risks: Risk[] = [];
  let assets: CompanyAsset[] = [];
  let measures: Measure[] = [];
  if (company) {
    assets = await ensureSuggestedAssets(supabase, company.id, company);
    const [risksRes, measuresRes] = await Promise.all([
      supabase
        .from("risks")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("measures")
        .select("*")
        .eq("company_id", company.id)
        .not("risk_id", "is", null),
    ]);
    risks = (risksRes.data ?? []) as Risk[];
    measures = (measuresRes.data ?? []) as Measure[];
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Risikoanalyse</h1>
        <p className="mt-1 text-slate-500">Identifizieren und bewerten Sie IT-Sicherheitsrisiken.</p>
      </div>
      {company && (
        <RisksPageClient
          companyId={company.id}
          initialRisks={risks}
          initialAssets={assets}
          initialMeasures={measures}
        />
      )}
    </DashboardShell>
  );
}
