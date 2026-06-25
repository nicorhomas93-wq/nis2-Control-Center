import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { LeadsTable } from "@/components/jarvis/LeadsTable";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { getLeadScoreCategory } from "@/lib/jarvis/lead-scoring";
import type { Lead } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function JarvisLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let leads: Lead[] = [];
  let missingTable = false;

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("lead_score", { ascending: false });

  if (error) {
    missingTable = isMissingTableError(error);
  } else {
    leads = (data ?? []) as Lead[];
    if (filter === "hot") {
      leads = leads.filter((l) => getLeadScoreCategory(l.lead_score) === "hot");
    }
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      <JarvisShell>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Leads</h2>
          <p className="text-sm text-slate-500">
            {filter === "hot"
              ? "Heiße Leads (Score 80–100)"
              : "Alle Leads mit Score und Begründung"}
          </p>
        </div>
        <LeadsTable leads={leads} />
      </JarvisShell>
    </DashboardShell>
  );
}
