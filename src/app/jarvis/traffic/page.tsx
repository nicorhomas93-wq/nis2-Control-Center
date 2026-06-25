import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { TrafficShell } from "@/components/jarvis/traffic/TrafficShell";
import { TrafficDashboard } from "@/components/jarvis/traffic/TrafficDashboard";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { getTrafficOverview, type TrafficOverview } from "@/lib/jarvis/traffic/overview";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function TrafficPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let overview: TrafficOverview = {
    stats: {
      activeTargetGroups: 0,
      activeCampaigns: 0,
      openTrafficTasks: 0,
      outreachDrafts: 0,
      contentIdeas: 0,
    },
    todayRecommendations: [],
    recentEvents: [],
  };
  let missingTable = false;

  try {
    overview = await getTrafficOverview(supabase);
  } catch (error) {
    const dbError =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string; message?: string })
        : null;
    missingTable = isMissingTableError(dbError);
  }

  const showSeed =
    !missingTable &&
    overview.stats.activeTargetGroups === 0 &&
    overview.stats.contentIdeas === 0;

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      <JarvisShell>
        <TrafficShell>
          <TrafficDashboard overview={overview} showSeed={showSeed} />
        </TrafficShell>
      </JarvisShell>
    </DashboardShell>
  );
}
