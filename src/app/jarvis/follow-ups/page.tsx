import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { FollowUpsList } from "@/components/jarvis/FollowUpsList";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function JarvisFollowUpsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("sales_tasks")
    .select("*, lead:leads(company_name, contact_name, email)")
    .eq("status", "open")
    .order("due_date", { ascending: true });

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Follow-ups</h2>
          <p className="text-sm text-slate-500">Offene Verkaufsaufgaben und nächste Schritte.</p>
        </div>
        <FollowUpsList tasks={data ?? []} />
      </JarvisShell>
    </DashboardShell>
  );
}
