import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import type { TrafficOverview } from "@/lib/jarvis/traffic/overview";
import { SeedTrafficButton } from "@/components/jarvis/traffic/SeedTrafficButton";

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

export function TrafficDashboard({
  overview,
  showSeed,
}: {
  overview: TrafficOverview;
  showSeed?: boolean;
}) {
  return (
    <div className="space-y-8">
      {showSeed && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="flex gap-3 pt-6 flex-row items-center justify-between">
            <p className="text-sm text-sky-900">
              Noch keine Traffic-Daten — Standard-Zielgruppen, Suchprofile und Vorlagen laden.
            </p>
            <SeedTrafficButton />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-5">
        <StatCard label="Aktive Zielgruppen" value={overview.stats.activeTargetGroups} />
        <StatCard label="Aktive Kampagnen" value={overview.stats.activeCampaigns} />
        <StatCard label="Offene Traffic-Aufgaben" value={overview.stats.openTrafficTasks} />
        <StatCard label="Outreach-Entwürfe" value={overview.stats.outreachDrafts} />
        <StatCard label="Content-Ideen" value={overview.stats.contentIdeas} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jarvis empfiehlt heute</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {overview.todayRecommendations.map((rec) => (
              <li
                key={rec.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{rec.text}</span>
                {rec.href && (
                  <Link href={rec.href} className="shrink-0 text-sky-600 hover:underline">
                    Öffnen →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {overview.recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Letzte Traffic-Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100 text-sm">
              {overview.recentEvents.map((event, i) => (
                <li key={i} className="flex justify-between gap-4 py-2">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
