import { DashboardShell } from "@/components/layout/DashboardShell";
import { MeasuresPageClient } from "@/components/measures/MeasuresPageClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import type { Measure } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function MeasuresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);
  if (!company && !missingTable) redirect("/login");

  let measures: Measure[] = [];
  if (company) {
    const { data } = await supabase.from("measures").select("*").eq("company_id", company.id).order("created_at", { ascending: false });
    measures = (data ?? []) as Measure[];
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Maßnahmen</h1>
        <p className="mt-1 text-slate-500">Sicherheitsmaßnahmen mit Status und Priorität verwalten.</p>
      </div>
      {company && <MeasuresPageClient companyId={company.id} initialMeasures={measures} />}
    </DashboardShell>
  );
}
