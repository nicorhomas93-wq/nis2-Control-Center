import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { KampagnenShell } from "@/components/jarvis/kampagnen/KampagnenShell";
import { KampagnenDashboard } from "@/components/jarvis/kampagnen/KampagnenDashboard";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { loadKampagnenData } from "@/lib/jarvis/kampagnen/load-data";
import { canAccessJarvis } from "@/lib/jarvis/access";
import { createClient } from "@/lib/supabase/server";

export default async function KampagnenPage() {
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

  const data = await loadKampagnenData();

  return (
    <DashboardShell>
      {data.missingTable && <SupabaseSetupBanner />}
      <JarvisShell>
        <Suspense fallback={<p className="text-sm text-slate-500">Laden…</p>}>
          <KampagnenShell>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Kampagnen</h2>
              <p className="text-sm text-slate-500">
                LinkedIn-Vertriebs-Cockpit — manueller Versand, volle Kontrolle.
              </p>
            </div>
            {!data.missingTable && (
              <KampagnenDashboard
                campaigns={data.campaigns}
                leads={data.leads}
                responses={data.responses}
                demos={data.demos}
                tasks={data.tasks}
              />
            )}
            {data.error && !data.missingTable && (
              <p className="text-sm text-red-600">{data.error}</p>
            )}
          </KampagnenShell>
        </Suspense>
      </JarvisShell>
    </DashboardShell>
  );
}
