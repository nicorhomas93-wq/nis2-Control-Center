import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { JARVIS_DISCLAIMER } from "@/lib/jarvis/constants";
import type { EmailTemplate, JarvisEvent } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function JarvisSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [templatesRes, eventsRes] = await Promise.all([
    supabase.from("email_templates").select("*").order("name"),
    supabase
      .from("jarvis_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const missingTable =
    isMissingTableError(templatesRes.error) || isMissingTableError(eventsRes.error);
  const templates = (templatesRes.data ?? []) as EmailTemplate[];
  const events = (eventsRes.data ?? []) as JarvisEvent[];

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      <JarvisShell>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>DSGVO & Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>{JARVIS_DISCLAIMER}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Erstkontakt-Mails nur nach manueller Freigabe</li>
                <li>Kein Massenmailing, kein Spam</li>
                <li>Consent-Status pro Lead pflegen (opt_in, legitimate_interest, no_contact)</li>
                <li>Jede versendete Mail wird in lead_interactions und jarvis_events protokolliert</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>E-Mail-Vorlagen ({templates.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Keine Vorlagen — Migration add_jarvis_sales.sql ausführen.
                </p>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{tpl.name}</p>
                    <p className="text-xs text-slate-500">
                      {tpl.purpose} · {tpl.active ? "aktiv" : "inaktiv"}
                    </p>
                    <p className="mt-2 text-sm font-medium">{tpl.subject}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vollständiges Aktivitätsprotokoll</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine Ereignisse.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {events.map((event) => (
                    <li key={event.id} className="flex justify-between gap-4 py-2">
                      <div>
                        <p className="font-medium text-slate-900">{event.summary}</p>
                        <p className="text-xs text-slate-400">
                          {event.event_type} · {event.entity_type ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-slate-400">
                        {formatDate(event.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </JarvisShell>
    </DashboardShell>
  );
}
