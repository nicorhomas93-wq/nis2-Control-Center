import { DashboardShell } from "@/components/layout/DashboardShell";
import { TasksClient } from "@/components/tasks/TasksClient";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany } from "@/lib/company";
import { redirect } from "next/navigation";

export default async function AufgabenPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company } = await getWorkspaceCompany(user.id);
  if (!company) redirect("/dashboard");

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Aufgaben</h1>
        <p className="mt-1 text-slate-500">
          Zentrale Übersicht über Risiken, Maßnahmen, Nachweise und Compliance-Aufgaben.
        </p>
      </div>
      <TasksClient companyId={company.id} initialTaskId={params.task ?? null} />
    </DashboardShell>
  );
}
