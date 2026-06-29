import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  securityLevelBadgeClass,
  securityLevelBarClass,
} from "@/lib/compliance/security-status";
import {
  SECURITY_LEVEL_LABELS,
  type ScoreDriver,
  type SecurityLevel,
  type SecurityScoreSnapshot,
} from "@/lib/compliance/types";

interface SecurityStatusCardProps {
  score: number;
  level: SecurityLevel;
  summary: string;
  drivers: ScoreDriver[];
  auditReadinessPercent: number;
  history: SecurityScoreSnapshot[];
}

export function SecurityStatusCard({
  score,
  level,
  summary,
  drivers,
  auditReadinessPercent,
  history,
}: SecurityStatusCardProps) {
  const topDrivers = drivers.slice(0, 5);
  const maxHistory = Math.max(...history.map((h) => h.score), score, 1);

  return (
    <Card className={`mb-8 border-2 ${securityLevelBadgeClass(level)}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/80 p-3 shadow-sm">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Live-Sicherheitsstatus</p>
              <CardTitle className="text-2xl">Sicherheitsstatus</CardTitle>
            </div>
          </div>
          <Badge className={`text-base px-3 py-1 ${securityLevelBadgeClass(level)}`}>
            {SECURITY_LEVEL_LABELS[level]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-5xl font-bold tabular-nums">{score}</p>
            <p className="text-sm opacity-80">von 100 Punkten</p>
          </div>
          <div className="min-w-[200px] flex-1">
            <div className="h-3 rounded-full bg-white/60">
              <div
                className={`h-3 rounded-full transition-all ${securityLevelBarClass(level)}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-2 text-sm">
              Audit-Bereitschaft: <strong>{auditReadinessPercent}%</strong>
            </p>
          </div>
        </div>

        <p className="text-base leading-relaxed">{summary}</p>

        {history.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
              Verlauf (30 Tage)
            </p>
            <div className="flex h-16 items-end gap-1">
              {history.map((point) => (
                <div
                  key={point.recorded_at}
                  className="flex-1 rounded-t bg-white/50"
                  style={{ height: `${Math.max(8, (point.score / maxHistory) * 100)}%` }}
                  title={`${point.recorded_at}: ${point.score}`}
                />
              ))}
            </div>
          </div>
        )}

        {topDrivers.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
              Was zieht den Score runter? (Top 5)
            </p>
            <ul className="space-y-2 text-sm">
              {topDrivers.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/50 px-3 py-2"
                >
                  <span>{d.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums">−{d.impact}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/audit" className="inline-flex items-center gap-1 font-medium hover:underline">
            Audit-Ordner prüfen <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/risks" className="inline-flex items-center gap-1 font-medium hover:underline">
            Risiken ansehen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
