import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { SalesPipeline } from "@/components/jarvis/SalesPipeline";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function JarvisPipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Verkaufs-Pipeline</h2>
          <p className="text-sm text-slate-500">Leads nach Verkaufsstatus gruppiert.</p>
        </div>
        <SalesPipeline leads={(data ?? []) as Lead[]} />
      </JarvisShell>
    </DashboardShell>
  );
}
