import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { ContentHubShell } from "@/components/jarvis/content-hub/ContentHubShell";
import { ContentHubDashboard } from "@/components/jarvis/content-hub/ContentHubDashboard";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { loadContentHubData } from "@/lib/jarvis/content-hub/load-data";
import { canAccessJarvis } from "@/lib/jarvis/access";
import { createClient } from "@/lib/supabase/server";

export default async function ContentHubPage() {
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

  const data = await loadContentHubData();

  return (
    <DashboardShell>
      {data.missingTable && <SupabaseSetupBanner />}
      <JarvisShell>
        <Suspense fallback={<p className="text-sm text-slate-500">Laden…</p>}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Content Hub</h2>
            <p className="text-sm text-slate-500">
              LinkedIn-Beiträge, Serien und Kalender — problembasiert, ohne Werbebot.
            </p>
          </div>
          <ContentHubShell>
            {!data.missingTable && (
              <ContentHubDashboard posts={data.posts} series={data.series} />
            )}
            {data.error && !data.missingTable && (
              <p className="text-sm text-red-600">{data.error}</p>
            )}
          </ContentHubShell>
        </Suspense>
      </JarvisShell>
    </DashboardShell>
  );
}
