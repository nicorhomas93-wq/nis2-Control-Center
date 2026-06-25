import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { TrafficShell } from "@/components/jarvis/traffic/TrafficShell";
import { TargetGroupsManager } from "@/components/jarvis/traffic/TargetGroupsManager";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import type { TrafficTargetGroup } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function TrafficTargetGroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("traffic_target_groups")
    .select("*")
    .order("priority")
    .order("name");

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <TrafficShell>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Zielgruppen</h2>
            <p className="text-sm text-slate-500">
              Zielgruppen für manuelle Recherche und Outreach vorbereiten.
            </p>
          </div>
          <TargetGroupsManager groups={(data ?? []) as TrafficTargetGroup[]} />
        </TrafficShell>
      </JarvisShell>
    </DashboardShell>
  );
}
