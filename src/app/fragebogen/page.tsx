import { DashboardShell } from "@/components/layout/DashboardShell";
import { QuestionnaireClient } from "@/components/questionnaires/QuestionnaireClient";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import { redirect } from "next/navigation";

export default async function FragebogenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company } = await getWorkspaceCompany(user.id);
  if (!company) redirect("/dashboard");

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Compliance-Fragebögen</h1>
        <p className="mt-1 text-slate-500">
          Strukturierte Bewertung für Backup, Zugriffskontrolle, Schulungen und weitere Pflichtbereiche.
        </p>
      </div>
      <QuestionnaireClient companyId={company.id} />
    </DashboardShell>
  );
}
