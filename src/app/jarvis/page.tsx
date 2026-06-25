import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { JarvisOverviewClient } from "@/components/jarvis/JarvisOverviewClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { JarvisBillingHint } from "@/components/billing/JarvisBillingHint";
import { createClient } from "@/lib/supabase/server";
import { getJarvisOverview, type JarvisOverview } from "@/lib/jarvis/overview";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function JarvisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let overview: JarvisOverview = {
    stats: {
      newLeads: 0,
      hotLeads: 0,
      openFollowUps: 0,
      sentEmails: 0,
      demoScheduled: 0,
      wonPilots: 0,
      unsyncedPilotRequests: 0,
    },
    recentEvents: [],
    recommendations: [],
  };
  let missingTable = false;

  try {
    overview = await getJarvisOverview(supabase);
  } catch (error) {
    const dbError =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string; message?: string })
        : null;
    missingTable = isMissingTableError(dbError);
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      <JarvisShell>
        <JarvisBillingHint />
        <JarvisOverviewClient
          stats={overview.stats}
          recentEvents={overview.recentEvents}
          recommendations={overview.recommendations}
        />
      </JarvisShell>
    </DashboardShell>
  );
}
