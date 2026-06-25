import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { TrafficShell } from "@/components/jarvis/traffic/TrafficShell";
import { OutreachDraftsList } from "@/components/jarvis/traffic/OutreachDraftsList";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import type { OutreachDraft } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function TrafficOutreachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("outreach_drafts")
    .select("*, target_group:traffic_target_groups(name)")
    .not("status", "eq", "archived")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <TrafficShell>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Outreach-Entwürfe</h2>
            <p className="text-sm text-slate-500">
              Texte vorbereiten, freigeben und manuell versenden — kein Massenversand.
            </p>
          </div>
          <OutreachDraftsList drafts={(data ?? []) as OutreachDraft[]} />
        </TrafficShell>
      </JarvisShell>
    </DashboardShell>
  );
}
