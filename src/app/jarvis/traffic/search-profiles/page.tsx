import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { TrafficShell } from "@/components/jarvis/traffic/TrafficShell";
import { SearchProfilesList } from "@/components/jarvis/traffic/SearchProfilesList";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import type { TrafficSearchProfile } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function TrafficSearchProfilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("traffic_search_profiles")
    .select("*, target_group:traffic_target_groups(name, industry)")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <TrafficShell>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Suchprofile</h2>
            <p className="text-sm text-slate-500">
              Suchbegriffe für manuelle Recherche (Google, LinkedIn, IHK etc.) — kein Scraping.
            </p>
          </div>
          <SearchProfilesList profiles={(data ?? []) as TrafficSearchProfile[]} />
        </TrafficShell>
      </JarvisShell>
    </DashboardShell>
  );
}
