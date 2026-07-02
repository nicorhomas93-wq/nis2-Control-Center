import { DashboardShell } from "@/components/layout/DashboardShell";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { ComplianceEvidencePageClient } from "@/components/compliance-evidence/ComplianceEvidencePageClient";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import { loadComplianceEvidenceEntries } from "@/lib/compliance-evidence/service";
import { buildEvidenceDashboardStats } from "@/lib/compliance-evidence/scoring";
import { getNis2EvidenceScope, getNis2EvidenceScopeLabel } from "@/lib/compliance-evidence/types";
import { redirect } from "next/navigation";

export default async function SchulungenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);

  let entries: Awaited<ReturnType<typeof loadComplianceEvidenceEntries>> = [];
  let stats = buildEvidenceDashboardStats([], company);
  const scope = getNis2EvidenceScope(company);
  const scopeLabel = getNis2EvidenceScopeLabel(scope);

  if (company) {
    try {
      entries = await loadComplianceEvidenceEntries(supabase, company.id);
      stats = buildEvidenceDashboardStats(entries, company);
    } catch {
      entries = [];
    }
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Schulungen & Nachweise</h1>
        <p className="mt-1 text-slate-500">
          Zentrale Ablage für Schulungsunterlagen, Teilnahmebescheinigungen, Phishing-Auswertungen
          und weitere Audit-Belege.
        </p>
      </div>
      {company ? (
        <ComplianceEvidencePageClient
          companyId={company.id}
          companyName={company.company_name ?? "Unternehmen"}
          nis2Status={company.nis2_status}
          initialEntries={entries}
          initialStats={stats}
          initialScope={scope}
          initialScopeLabel={scopeLabel}
        />
      ) : (
        <p className="text-sm text-slate-600">Bitte zuerst das Unternehmensprofil vervollständigen.</p>
      )}
    </DashboardShell>
  );
}
