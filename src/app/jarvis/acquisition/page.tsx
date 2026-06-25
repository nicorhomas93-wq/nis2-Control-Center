import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { AcquisitionDashboard } from "@/components/jarvis/acquisition/AcquisitionDashboard";
import { JarvisBillingHint } from "@/components/billing/JarvisBillingHint";
import { createClient } from "@/lib/supabase/server";
import { getAcquisitionOverview } from "@/lib/acquisition/overview";
import { redirect } from "next/navigation";
import { canAccessJarvis } from "@/lib/jarvis/access";

export default async function JarvisAcquisitionPage() {
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

  const overview = await getAcquisitionOverview();

  return (
    <DashboardShell>
      <JarvisShell>
        <JarvisBillingHint />
        <AcquisitionDashboard overview={overview} />
      </JarvisShell>
    </DashboardShell>
  );
}
