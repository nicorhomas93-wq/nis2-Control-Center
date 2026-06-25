import { DashboardShell } from "@/components/layout/DashboardShell";
import { RisksPageClient } from "@/components/risks/RisksPageClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany } from "@/lib/company";
import type { Risk } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function RisksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable } = await getOrCreateCompany(user.id);
  if (!company && !missingTable) redirect("/login");

  let risks: Risk[] = [];
  if (company) {
    const { data } = await supabase.from("risks").select("*").eq("company_id", company.id).order("created_at", { ascending: false });
    risks = (data ?? []) as Risk[];
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Risikoanalyse</h1>
        <p className="mt-1 text-slate-500">Identifizieren und bewerten Sie IT-Sicherheitsrisiken.</p>
      </div>
      {company && <RisksPageClient companyId={company.id} initialRisks={risks} />}
    </DashboardShell>
  );
}
