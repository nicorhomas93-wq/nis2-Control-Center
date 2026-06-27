import { DashboardShell } from "@/components/layout/DashboardShell";
import { CompanyProfileForm } from "@/components/forms/CompanyProfileForm";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import { redirect } from "next/navigation";

export default async function CompanyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);
  if (!company && !missingTable) redirect("/login");

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Unternehmen</h1>
        <p className="mt-1 text-slate-500">
          {isViewingMandant
            ? "Mandantenprofil für NIS2-Compliance erfassen."
            : "Erfassen Sie Ihre Unternehmensdaten für NIS2-Compliance."}
        </p>
      </div>
      {company && (
        <CompanyProfileForm
          companyId={company.id}
          initialData={{
            company_name: company.company_name ?? "",
            industry: company.industry ?? "",
            employee_count: company.employee_count,
            annual_revenue: company.annual_revenue,
            balance_sheet_total: company.balance_sheet_total,
            country: company.country ?? "DE",
            eu_operations: company.eu_operations,
            uses_microsoft_365: company.uses_microsoft_365,
            uses_cloud_services: company.uses_cloud_services,
            critical_business_processes: company.critical_business_processes ?? "",
            has_it_service_provider: company.has_it_service_provider,
            publicly_accessible_systems: company.publicly_accessible_systems,
            security_contact_name: company.security_contact_name ?? "",
            security_contact_email: company.security_contact_email ?? "",
          }}
        />
      )}
    </DashboardShell>
  );
}
