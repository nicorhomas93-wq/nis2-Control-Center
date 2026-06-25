import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { TrafficShell } from "@/components/jarvis/traffic/TrafficShell";
import { CampaignsList } from "@/components/jarvis/traffic/CampaignsList";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import type { TrafficCampaign } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function TrafficCampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("traffic_campaigns")
    .select("*, target_group:traffic_target_groups(name)")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <TrafficShell>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Kampagnen</h2>
            <p className="text-sm text-slate-500">
              Manuelle Outreach-Kampagnen mit Wochenzielen — keine Automation.
            </p>
          </div>
          <CampaignsList campaigns={(data ?? []) as TrafficCampaign[]} />
        </TrafficShell>
      </JarvisShell>
    </DashboardShell>
  );
}
