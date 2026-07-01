import { DashboardShell } from "@/components/layout/DashboardShell";
import { DocumentsPageClient } from "@/components/documents/DocumentsPageClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany, isCompanyProfileComplete } from "@/lib/company";
import { isOpenAIConfigured } from "@/lib/ai/generate";
import { activeOnly } from "@/lib/supabase/soft-delete";
import type { Document } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);
  if (!company && !missingTable) redirect("/login");

  let documents: Document[] = [];
  if (company) {
    const { data } = await activeOnly(
      supabase
        .from("documents")
        .select("*")
        .eq("company_id", company.id)
        .order("updated_at", { ascending: false })
    );
    documents = (data ?? []).map((d) => ({
      ...(d as Document),
      version: (d as Document).version ?? 1,
    }));
  }

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}
      <div className="mb-8 no-print">
        <h1 className="text-2xl font-bold text-slate-900">Dokumente</h1>
        <p className="mt-1 text-slate-500">
          NIS2-Dokumentation generieren, versionieren und exportieren.
        </p>
      </div>
      {company && (
        <DocumentsPageClient
          companyId={company.id}
          companyName={company.company_name ?? undefined}
          initialDocuments={documents}
          profileComplete={isCompanyProfileComplete(company)}
          demoMode={!isOpenAIConfigured()}
        />
      )}
    </DashboardShell>
  );
}
