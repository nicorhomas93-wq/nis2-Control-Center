import { DashboardShell } from "@/components/layout/DashboardShell";
import { AssessmentCheck } from "@/components/assessment/AssessmentCheck";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import { redirect } from "next/navigation";

export default async function AssessmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);
  if (!company && !missingTable) redirect("/login");

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Betroffenheitscheck</h1>
        <p className="mt-1 text-slate-500">Prüfen Sie Ihre NIS2-Betroffenheit auf Basis Ihrer Unternehmensdaten.</p>
      </div>
      {company && (
        <AssessmentCheck companyId={company.id} currentStatus={company.nis2_status} />
      )}
    </DashboardShell>
  );
}
