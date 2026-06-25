import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { TrafficShell } from "@/components/jarvis/traffic/TrafficShell";
import { ContentIdeasList } from "@/components/jarvis/traffic/ContentIdeasList";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import type { ContentIdea } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function TrafficContentIdeasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("content_ideas")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <TrafficShell>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Content-Ideen</h2>
            <p className="text-sm text-slate-500">
              Posts, Artikel und Checklisten für LinkedIn, Website und mehr.
            </p>
          </div>
          <ContentIdeasList ideas={(data ?? []) as ContentIdea[]} />
        </TrafficShell>
      </JarvisShell>
    </DashboardShell>
  );
}
