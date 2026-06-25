import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { TrafficShell } from "@/components/jarvis/traffic/TrafficShell";
import { WeeklyPlanList } from "@/components/jarvis/traffic/WeeklyPlanList";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import type { TrafficTask } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function TrafficWeeklyPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data, error } = await supabase
    .from("traffic_tasks")
    .select("*, campaign:traffic_campaigns(name)")
    .eq("status", "open")
    .lte("due_date", weekEnd.toISOString())
    .order("due_date", { ascending: true });

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <TrafficShell>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Wochenplan</h2>
            <p className="text-sm text-slate-500">
              Offene Traffic-Aufgaben für die nächsten 7 Tage.
            </p>
          </div>
          <WeeklyPlanList tasks={(data ?? []) as TrafficTask[]} />
        </TrafficShell>
      </JarvisShell>
    </DashboardShell>
  );
}
