import { DashboardShell } from "@/components/layout/DashboardShell";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { VendorsPageClient } from "@/components/vendors/VendorsPageClient";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import {
  buildVendorDashboardStats,
  loadVendorsWithDetails,
} from "@/lib/vendors/service";
import { redirect } from "next/navigation";

export default async function LieferantenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);

  let vendors: Awaited<ReturnType<typeof loadVendorsWithDetails>> = [];
  let stats = buildVendorDashboardStats([]);

  if (company) {
    try {
      vendors = await loadVendorsWithDetails(supabase, company.id);
      stats = buildVendorDashboardStats(vendors);
    } catch {
      vendors = [];
    }
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Lieferanten</h1>
        <p className="mt-1 text-slate-500">
          Lieferantenbewertungen, Nachweise und Audit-Ordner 08_Lieferantenbewertung.
        </p>
      </div>
      {company ? (
        <VendorsPageClient
          companyId={company.id}
          companyName={company.company_name ?? "Unternehmen"}
          initialVendors={vendors}
          initialStats={stats}
        />
      ) : (
        <p className="text-sm text-slate-600">Bitte zuerst das Unternehmensprofil vervollständigen.</p>
      )}
    </DashboardShell>
  );
}
