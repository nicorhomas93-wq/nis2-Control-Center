import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { AcquisitionDashboard } from "@/components/jarvis/acquisition/AcquisitionDashboard";
import { createClient } from "@/lib/supabase/server";
import { getAcquisitionOverview } from "@/lib/acquisition/overview";
import { redirect } from "next/navigation";

export default async function JarvisAcquisitionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const overview = await getAcquisitionOverview();

  return (
    <DashboardShell>
      <JarvisShell>
        <AcquisitionDashboard overview={overview} />
      </JarvisShell>
    </DashboardShell>
  );
}
