import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatStepDeadline } from "@/lib/compliance/next-steps";
import type { NextStepAction } from "@/lib/compliance/types";

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-amber-100 text-amber-800",
  medium: "bg-sky-100 text-sky-800",
  low: "bg-slate-100 text-slate-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

export function NextStepsCard({ steps }: { steps: NextStepAction[] }) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-brand-600" />
          <CardTitle>Das solltest du jetzt tun</CardTitle>
        </div>
        <p className="text-sm text-slate-500">
          Konkrete nächste Schritte — priorisiert nach Kritikalität, Frist und Audit-Relevanz.
        </p>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p className="font-medium text-emerald-800">
              Tolle Arbeit – aktuell sind keine kritischen nächsten Schritte offen.
            </p>
            <p className="text-slate-500">
              Bitte prüfen Sie regelmäßig Nachweise, Dokumente und Maßnahmen.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <Badge className={PRIORITY_BADGE[step.priority] ?? PRIORITY_BADGE.medium}>
                      {PRIORITY_LABELS[step.priority] ?? step.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{step.reason}</p>
                  {step.asset && (
                    <p className="mt-1 text-xs text-slate-500">Betroffenes Asset: {step.asset}</p>
                  )}
                  {step.recommendation && (
                    <p className="mt-1 text-xs text-brand-700">
                      Empfehlung: {step.recommendation}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Frist: {formatStepDeadline(step.deadline)}
                  </p>
                </div>
                <Link href={step.href} className="shrink-0">
                  <Button size="sm">
                    Jetzt bearbeiten
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
