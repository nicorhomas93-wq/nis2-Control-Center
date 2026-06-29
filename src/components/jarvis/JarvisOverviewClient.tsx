import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import type { JarvisEvent } from "@/lib/types";
import type {
  JarvisOverviewStats,
  JarvisRecommendation,
} from "@/lib/jarvis/overview";
import { SyncPilotRequestsButton } from "@/components/jarvis/SyncPilotRequestsButton";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export function JarvisOverviewClient({
  stats,
  recentEvents,
  recommendations,
}: {
  stats: JarvisOverviewStats;
  recentEvents: JarvisEvent[];
  recommendations: JarvisRecommendation[];
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Neue Leads" value={stats.newLeads} />
        <StatCard label="Heiße Leads" value={stats.hotLeads} />
        <StatCard label="Offene Follow-ups" value={stats.openFollowUps} />
        <StatCard label="Gesendete E-Mails" value={stats.sentEmails} />
        <StatCard label="Demo geplant" value={stats.demoScheduled} />
        <StatCard label="Gewonnene Piloten" value={stats.wonPilots} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empfohlene nächste Schritte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {recommendations.map((rec) => (
              <li key={rec.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-700">{rec.text}</span>
                {rec.href && (
                  <Link
                    href={rec.href}
                    className="shrink-0 text-brand-600 hover:underline"
                  >
                    Öffnen →
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {stats.unsyncedPilotRequests > 0 && (
            <SyncPilotRequestsButton unsyncedCount={stats.unsyncedPilotRequests} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Jarvis-Aktivitäten</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-slate-500">
              Noch keine Jarvis-Ereignisse. Starten Sie mit der Pilot-Synchronisierung.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentEvents.map((event) => (
                <li key={event.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{event.summary}</p>
                    <p className="text-xs text-slate-400">{event.event_type}</p>
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
  );
}
