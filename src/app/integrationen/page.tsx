import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { IntegrationsPageClient } from "@/components/integrations/IntegrationsPageClient";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";

export default async function IntegrationenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);

  let providers: Record<string, unknown>[] = [];
  let connections: Record<string, unknown>[] = [];
  let syncRuns: Record<string, unknown>[] = [];
  let webhooks: Record<string, unknown>[] = [];
  let dbError: string | null = null;
  let tableMissing = missingTable;

  if (company) {
    const [providersRes, connectionsRes, runsRes, hooksRes] = await Promise.all([
      supabase.from("integration_providers").select("*").order("name"),
      supabase
        .from("integration_connections")
        .select("*, integration_providers(id,name,key,category,status,icon)")
        .eq("tenant_id", company.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("integration_sync_runs")
        .select("*")
        .eq("tenant_id", company.id)
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("integration_webhooks")
        .select("*")
        .eq("tenant_id", company.id)
        .order("created_at", { ascending: false }),
    ]);

    const firstError = providersRes.error || connectionsRes.error || runsRes.error || hooksRes.error;
    if (firstError) {
      dbError = getDbErrorMessage(firstError);
      tableMissing = tableMissing || isMissingTableError(firstError);
    } else {
      providers = providersRes.data ?? [];
      connections = connectionsRes.data ?? [];
      syncRuns = runsRes.data ?? [];
      webhooks = hooksRes.data ?? [];
    }
  }

  return (
    <DashboardShell>
      {(tableMissing || !company) && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Integrationen</h1>
        <p className="mt-1 text-slate-500">
          Binde TKND an SAP, Jira, Microsoft 365, ServiceNow und weitere Systeme an. CSV/Excel-Import
          ist als erste funktionsfähige Integration sofort nutzbar.
        </p>
      </div>

      {company ? (
        <IntegrationsPageClient
          tenantId={company.id}
          companyName={company.company_name ?? "Unternehmen"}
          initialProviders={providers}
          initialConnections={connections}
          initialSyncRuns={syncRuns}
          initialWebhooks={webhooks}
          initialError={dbError}
        />
      ) : (
        <p className="text-sm text-slate-600">Bitte zuerst das Unternehmensprofil vervollständigen.</p>
      )}
    </DashboardShell>
  );
}
