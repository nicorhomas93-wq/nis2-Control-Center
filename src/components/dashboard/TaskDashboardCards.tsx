"use client";

import Link from "next/link";
import { AlertTriangle, CheckSquare, Database, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { TaskItem } from "@/lib/tasks/types";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/tasks/types";
import { formatDate } from "@/lib/utils";

interface TaskDashboardCardsProps {
  myTasks: TaskItem[];
  teamCritical: TaskItem[];
  missingEvidenceCount: number;
  auditAreas: string[];
  dataQualityPercent: number;
  dataQualityHints: string[];
  myOpenCount: number;
  myOverdueCount: number;
}

export function TaskDashboardCards({
  myTasks,
  teamCritical,
  missingEvidenceCount,
  auditAreas,
  dataQualityPercent,
  dataQualityHints,
  myOpenCount,
  myOverdueCount,
}: TaskDashboardCardsProps) {
  const dqColor =
    dataQualityPercent >= 70
      ? "text-emerald-600"
      : dataQualityPercent >= 50
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4" />
            Meine offenen Aufgaben
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-4">
            <span>
              <span className="text-2xl font-bold text-slate-900">{myOpenCount}</span>
              <span className="ml-1 text-slate-500">offen</span>
            </span>
            {myOverdueCount > 0 ? (
              <span className="text-orange-600">
                <span className="text-2xl font-bold">{myOverdueCount}</span>
                <span className="ml-1">überfällig</span>
              </span>
            ) : null}
          </div>
          <ul className="space-y-2">
            {myTasks.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <Link href={`/aufgaben?task=${t.id}`} className="truncate text-brand-600 hover:underline">
                  {t.title}
                </Link>
                {t.due_date ? (
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(t.due_date)}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <Link href="/aufgaben?filter=mine" className="text-xs text-brand-600 hover:underline">
            Alle meine Aufgaben →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Kritische Team-Aufgaben
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {teamCritical.length === 0 ? (
            <p className="text-slate-500">Keine kritischen offenen Aufgaben.</p>
          ) : (
            teamCritical.slice(0, 5).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 py-2">
                <Link href={`/aufgaben?task=${t.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                  {t.title}
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge className="bg-red-100 text-red-800">{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                  {t.due_date ? formatDate(t.due_date) : "—"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileWarning className="h-4 w-4 text-amber-500" />
            Fehlende Nachweise
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-2xl font-bold text-slate-900">{missingEvidenceCount}</p>
          {auditAreas.length > 0 ? (
            <p className="mt-2 text-slate-600">
              Betroffene Bereiche: {auditAreas.slice(0, 3).join(", ")}
            </p>
          ) : (
            <p className="mt-2 text-slate-500">Alle Pflichtnachweise vorhanden.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Datenqualität
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className={dqColor}>
            <span className="text-3xl font-bold">{dataQualityPercent}</span>
            <span className="text-lg">%</span>
          </p>
          {dataQualityHints.length > 0 ? (
            <ul className="mt-2 space-y-1 text-slate-600">
              {dataQualityHints.map((h) => (
                <li key={h}>· {h}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-slate-500">Angaben sind weitgehend belastbar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
