import { DashboardShell } from "@/components/layout/DashboardShell";
import { IncidentsPageClient } from "@/components/incidents/IncidentsPageClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import type { Incident } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function IncidentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);
  if (!company && !missingTable) redirect("/login");

  let incidents: Incident[] = [];
  if (company) {
    const { data } = await supabase.from("incidents").select("*").eq("company_id", company.id).order("created_at", { ascending: false });
    incidents = (data ?? []) as Incident[];
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Sicherheitsvorfall</h1>
        <p className="mt-1 text-slate-500">
          Vorfälle dokumentieren, Incident Response bearbeiten und Nachweise erzeugen.
        </p>
      </div>
      {company && (
        <IncidentsPageClient
          companyId={company.id}
          companyName={company.company_name ?? undefined}
          initialIncidents={incidents}
        />
      )}
    </DashboardShell>
  );
}
