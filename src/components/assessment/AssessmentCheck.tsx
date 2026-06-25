"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ASSESSMENT_DISCLAIMER,
  getNis2StatusColor,
  getNis2StatusLabel,
} from "@/lib/nis2/betroffenheit";
import type { AssessmentResult, Nis2Status } from "@/lib/types";
import { CheckCircle2, Loader2 } from "lucide-react";

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
        </>
      )}
    </div>
  );
}
