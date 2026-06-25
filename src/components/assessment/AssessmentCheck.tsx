"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ASSESSMENT_DISCLAIMER,
  getNis2StatusColor,
  getNis2StatusLabel,
} from "@/lib/nis2/betroffenheit";
import type { AssessmentResult, Nis2Status } from "@/lib/types";

interface AssessmentCheckProps {
  companyId: string;
  currentStatus: Nis2Status;
}

export function AssessmentCheck({ companyId, currentStatus }: AssessmentCheckProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Prüfung fehlgeschlagen");
      setLoading(false);
      return;
    }

    setResult(data);
    setLoading(false);
    router.refresh();
  }

  const displayStatus = result?.status ?? currentStatus;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {ASSESSMENT_DISCLAIMER}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NIS2-Betroffenheitscheck</CardTitle>
          <CardDescription>
            Automatische Ersteinstufung auf Basis Ihres Unternehmensprofils.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Aktueller Status:</span>
            <Badge className={getNis2StatusColor(displayStatus)}>
              {getNis2StatusLabel(displayStatus)}
            </Badge>
          </div>
          <Button onClick={runCheck} disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Prüfung läuft...</>
            ) : (
              "Betroffenheitscheck durchführen"
            )}
          </Button>
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader><CardTitle>Ergebnis</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-3">
                <Badge className={getNis2StatusColor(result.status)}>
                  {getNis2StatusLabel(result.status)}
                </Badge>
                <span className="text-sm text-slate-500">Score: {result.score}%</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{result.reasoning}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Nächste Schritte</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.nextSteps.map((step) => (
                  <li key={step} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {step}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-amber-900">Was das für Sie bedeutet</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-950">
              <p>
                Ein Ergebnis allein schützt Sie nicht. Ohne Dokumentation, Maßnahmen und
                Nachweise sind Sie bei einem Vorfall oder einer Prüfung nicht handlungsfähig.
              </p>
              <p className="font-medium">
                Bei erheblichen Sicherheitsvorfällen gilt eine Meldefrist von 72 Stunden.
                Haben Sie die Unterlagen dafür?
              </p>
            </CardContent>
          </Card>

          <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white">
            <CardContent className="pt-6 text-center">
              <h3 className="text-xl font-bold text-slate-900">
                Jetzt vom Ergebnis zum Nachweis
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Bauen Sie Schritt für Schritt Ihre NIS2-Dokumentation auf — von Pflichtdokumenten
                bis zum fertigen Audit-Ordner.
              </p>
              <Link href="/pricing" className="mt-6 inline-block">
                <Button size="lg">
                  Jetzt NIS2-System starten
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="mt-3 text-xs text-slate-500">
                Pläne ab 49 €/Monat · Jederzeit kündbar
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
