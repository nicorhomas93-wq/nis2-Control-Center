import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { SyncPilotRequestsButton } from "@/components/jarvis/SyncPilotRequestsButton";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead, PilotRequest } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

async function loadPilotRequests(supabase: Awaited<ReturnType<typeof createClient>>) {
  const res = await supabase
    .from("pilot_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (!res.error) return (res.data ?? []) as PilotRequest[];

  const admin = createAdminClient();
  if (!admin) return [];
  const adminRes = await admin
    .from("pilot_requests")
    .select("*")
    .order("created_at", { ascending: false });
  return (adminRes.data ?? []) as PilotRequest[];
}

export default async function JarvisPilotRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let requests: PilotRequest[] = [];
  let leads: Lead[] = [];
  let missingTable = false;

  try {
    requests = await loadPilotRequests(supabase);
    const leadsRes = await supabase.from("leads").select("email");
    if (leadsRes.error && isMissingTableError(leadsRes.error)) {
      missingTable = true;
    } else {
      leads = (leadsRes.data ?? []) as Lead[];
    }
  } catch {
    missingTable = true;
  }

  const existingEmails = new Set(
    leads.map((l) => l.email?.trim().toLowerCase()).filter(Boolean)
  );
  const unsynced = requests.filter((r) => {
    const email = r.email?.trim().toLowerCase();
    return email && !existingEmails.has(email);
  }).length;

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      <JarvisShell>
        <div className="mb-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pilotanfragen</h2>
            <p className="text-sm text-slate-500">
              Pilotanfragen aus dem öffentlichen Formular — manuell als Leads übernehmen.
            </p>
          </div>
          <SyncPilotRequestsButton unsyncedCount={unsynced} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle Pilotanfragen ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Pilotanfragen.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-3 pr-4 font-medium">Unternehmen</th>
                      <th className="py-3 pr-4 font-medium">Kontakt</th>
                      <th className="py-3 pr-4 font-medium">Branche</th>
                      <th className="py-3 pr-4 font-medium">Lead?</th>
                      <th className="py-3 font-medium">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => {
                      const synced = existingEmails.has(req.email.trim().toLowerCase());
                      return (
                        <tr key={req.id} className="border-b border-slate-100">
                          <td className="py-3 pr-4 font-medium">{req.company}</td>
                          <td className="py-3 pr-4">
                            <div>{req.name}</div>
                            <div className="text-xs text-slate-500">{req.email}</div>
                          </td>
                          <td className="py-3 pr-4">{req.industry ?? "—"}</td>
                          <td className="py-3 pr-4">
                            {synced ? (
                              <span className="text-green-700">✓ synchronisiert</span>
                            ) : (
                              <span className="text-amber-700">offen</span>
                            )}
                          </td>
                          <td className="py-3 text-slate-500">{formatDate(req.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </JarvisShell>
    </DashboardShell>
  );
}
