import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { EmailDraftsList } from "@/components/jarvis/EmailDraftsList";
import { getJarvisEmailConfig } from "@/lib/jarvis/email-config";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";

export default async function JarvisDraftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("lead_interactions")
    .select("*, lead:leads(company_name, contact_name, email, consent_status)")
    .eq("type", "email")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  const emailConfig = getJarvisEmailConfig();

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">E-Mail-Entwürfe</h2>
          <p className="text-sm text-slate-500">
            Entwürfe sind intern gespeichert. Versand, Kopieren oder Mailprogramm sind getrennte
            Aktionen.
          </p>
        </div>
        <EmailDraftsList drafts={data ?? []} emailConfig={emailConfig} />
      </JarvisShell>
    </DashboardShell>
  );
}
