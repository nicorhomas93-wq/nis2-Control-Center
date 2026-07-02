import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { LinkedInPublishingShell } from "@/components/jarvis/linkedin-publishing/LinkedInPublishingShell";
import { LinkedInPublishingDashboard } from "@/components/jarvis/linkedin-publishing/LinkedInPublishingDashboard";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { loadLinkedInPublishingData } from "@/lib/jarvis/linkedin-publishing/load-data";
import { canAccessJarvis } from "@/lib/jarvis/access";
import { createClient } from "@/lib/supabase/server";

export default async function LinkedInPublishingPage() {
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

  const data = await loadLinkedInPublishingData(user.id);

  return (
    <DashboardShell>
      {data.missingTable && <SupabaseSetupBanner />}
      <JarvisShell>
        <Suspense fallback={<p className="text-sm text-slate-500">Laden…</p>}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">LinkedIn Publishing</h2>
            <p className="text-sm text-slate-500">
              Content erstellen, planen, vorschauen — Veröffentlichung nur per Klick.
            </p>
          </div>
          <LinkedInPublishingShell>
            {!data.missingTable && (
              <LinkedInPublishingDashboard
                account={data.account}
                posts={data.posts}
                contentHubPosts={data.contentHubPosts}
                campaigns={data.campaigns}
                stats={data.stats}
                oauthConfigured={data.oauthConfigured}
              />
            )}
            {data.error && !data.missingTable && (
              <p className="text-sm text-red-600">{data.error}</p>
            )}
          </LinkedInPublishingShell>
        </Suspense>
      </JarvisShell>
    </DashboardShell>
  );
}
