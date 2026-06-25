"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Risk } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Sparkles } from "lucide-react";

const LEVEL_COLORS = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-emerald-100 text-emerald-800",
};

const LEVEL_LABELS = { high: "Hoch", medium: "Mittel", low: "Niedrig" };

interface RisksPageClientProps {
  companyId: string;
  initialRisks: Risk[];
}

export function RisksPageClient({ companyId, initialRisks }: RisksPageClientProps) {
  const router = useRouter();
  const [risks, setRisks] = useState(initialRisks);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateAnalysis() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/generate-risk-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Analyse fehlgeschlagen");
      setLoading(false);
      return;
    }

    setRisks(data.risks ?? []);
    setAnalysis(data.analysis ?? null);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            Risikoanalyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Generieren Sie eine strukturierte Risikoanalyse auf Basis Ihrer Unternehmensdaten.
          </p>
          <Button onClick={generateAnalysis} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird generiert...</> : "Risikoanalyse generieren"}
          </Button>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </CardContent>
      </Card>

      {risks.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Risikomatrix</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-6 py-3 font-medium">Asset</th>
                  <th className="px-6 py-3 font-medium">Bedrohung</th>
                  <th className="px-6 py-3 font-medium">Risiko</th>
                  <th className="px-6 py-3 font-medium">Maßnahme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {risks.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">{r.asset}</td>
                    <td className="px-6 py-4 text-slate-600">{r.threat}</td>
                    <td className="px-6 py-4">
                      <Badge className={LEVEL_COLORS[r.risk_level]}>{LEVEL_LABELS[r.risk_level]}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{r.measure ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card>
          <CardHeader><CardTitle>Vollständige Analyse</CardTitle></CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{analysis}</div>
          </CardContent>
        </Card>
      )}

      {risks.length === 0 && !analysis && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Noch keine Risikoanalyse vorhanden. Klicken Sie auf „Risikoanalyse generieren“.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
