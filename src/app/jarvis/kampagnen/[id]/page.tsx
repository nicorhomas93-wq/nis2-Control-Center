import { redirect, notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { KampagnenShell } from "@/components/jarvis/kampagnen/KampagnenShell";
import { CampaignDetailClient } from "@/components/jarvis/kampagnen/CampaignDetailClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { loadCampaignDetail } from "@/lib/jarvis/kampagnen/load-data";
import { canAccessJarvis } from "@/lib/jarvis/access";
import { createClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/supabase/db-error";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { campaign, leads, responses, demos, error } = await loadCampaignDetail(id);

  if (error && isMissingTableError({ message: error, code: "42P01" })) {
    return (
      <DashboardShell>
        <SupabaseSetupBanner />
      </DashboardShell>
    );
  }

  if (!campaign) notFound();

  return (
    <DashboardShell>
      <JarvisShell>
        <KampagnenShell>
          <CampaignDetailClient
            campaign={campaign}
            leads={leads}
            responses={responses}
            demos={demos}
          />
        </KampagnenShell>
      </JarvisShell>
    </DashboardShell>
  );
}
