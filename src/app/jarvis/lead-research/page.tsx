import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { LeadResearchPanel } from "@/components/jarvis/lead-research/LeadResearchPanel";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { canAccessJarvis } from "@/lib/jarvis/access";
import { createClient } from "@/lib/supabase/server";
import type { JarvisLeadResearchSignal } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";

export default async function LeadResearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canAccessJarvis(user.email, profile?.role)) {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("jarvis_lead_research_signals")
    .select("*")
    .order("research_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Lead Research</h2>
          <p className="text-sm text-slate-500">
            NIS2-Bedarfssignale aus Ausschreibungen, Jobs und Meldungen — bewertet und übernehmbar
            in den Lead Finder.
          </p>
        </div>
        {!error && (
          <LeadResearchPanel signals={(data ?? []) as JarvisLeadResearchSignal[]} />
        )}
        {error && !isMissingTableError(error) && (
          <p className="text-sm text-red-600">{error.message}</p>
        )}
      </JarvisShell>
    </DashboardShell>
  );
}
