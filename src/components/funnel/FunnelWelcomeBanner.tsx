import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface FunnelWelcomeBannerProps {
  complianceScore: number;
  openMeasures: number;
  documentCount: number;
  auditPercent: number;
}

export function FunnelWelcomeBanner({
  complianceScore,
  openMeasures,
  documentCount,
  auditPercent,
}: FunnelWelcomeBannerProps) {
  const steps = [
    { done: true, label: "Setup abgeschlossen" },
    { done: documentCount > 0, label: "Erstes Dokument erstellen" },
    { done: openMeasures === 0 && documentCount > 0, label: "Maßnahmen planen" },
    { done: auditPercent >= 50, label: "Audit-Ordner aufbauen" },
  ];

  return (
    <Card className="mb-8 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Setup abgeschlossen
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Willkommen — Ihr NIS2-Projekt startet hier
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Compliance-Status: {complianceScore}% · {documentCount} Dokumente ·{" "}
              {openMeasures} offene Maßnahmen
            </p>
          </div>
          <Link href="/company">
            <Button>
              Jetzt starten
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm text-slate-700">
              <CheckCircle2
                className={`h-4 w-4 shrink-0 ${s.done ? "text-emerald-500" : "text-slate-300"}`}
              />
              {s.label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
