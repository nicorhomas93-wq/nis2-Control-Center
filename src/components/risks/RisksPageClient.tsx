"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyAsset, Measure, Risk } from "@/lib/types";
import { resolveRiskAsset } from "@/lib/assets/resolve";
import { ASSET_CATEGORY_LABELS } from "@/lib/assets/types";
import { RiskAssistModal, type RiskAssistSaveResult } from "@/components/risks/RiskAssistModal";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { resolveObligationStatus } from "@/lib/compliance/obligations";
import { displayRiskField, RISK_FIELD_FALLBACKS } from "@/lib/compliance/risk-display";
import { OBLIGATION_STATUS_LABELS } from "@/lib/compliance/types";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

const LEVEL_COLORS = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-emerald-100 text-emerald-800",
};

const LEVEL_LABELS = { high: "Hoch", medium: "Mittel", low: "Niedrig" };

interface RisksPageClientProps {
  companyId: string;
  initialRisks: Risk[];
  initialAssets: CompanyAsset[];
  initialMeasures: Measure[];
}

export function RisksPageClient({
  companyId,
  initialRisks,
  initialAssets,
  initialMeasures,
}: RisksPageClientProps) {
  const router = useRouter();
  const [risks, setRisks] = useState(initialRisks);
  const [assets, setAssets] = useState(initialAssets);
  const [measureByRiskId, setMeasureByRiskId] = useState<Record<string, Measure>>(() => {
    const map: Record<string, Measure> = {};
    for (const m of initialMeasures) {
      if (m.risk_id && !map[m.risk_id]) map[m.risk_id] = m;
    }
    return map;
  });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const assetsRes = await fetch(`/api/assets?companyId=${companyId}`);
    const assetsData = await assetsRes.json();
    if (assetsRes.ok) setAssets(assetsData.assets ?? []);
    router.refresh();
  }

  function handleAssistSaved(id: string, result: RiskAssistSaveResult) {
    setRisks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...result.risk } : r))
    );
    if (result.measure) {
      setMeasureByRiskId((prev) => ({ ...prev, [id]: result.measure! }));
    }
    setEditingId(null);
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
            Strukturierte Risikoanalyse mit konkreten Assets, Bedrohungen, Schwachstellen und
            Maßnahmen — abgeleitet aus Ihrem Unternehmensprofil. Kritische Risiken werden als
            Pflichtaufgaben mit Frist hinterlegt.
          </p>
          <Button onClick={generateAnalysis} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird generiert...</> : "Risikoanalyse generieren"}
          </Button>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </CardContent>
      </Card>

      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asset-Register</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-600">
              Jedes Risiko ist einem Asset mit Kategorie zugeordnet. Fehlt eine Zuordnung, gilt
              automatisch „Allgemeines Unternehmensrisiko“.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">
                    {ASSET_CATEGORY_LABELS[a.category]} · Kritikalität:{" "}
                    {a.criticality === "high" ? "Hoch" : a.criticality === "low" ? "Niedrig" : "Mittel"}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {risks.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Risikomatrix</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Kategorie</th>
                  <th className="px-4 py-3 font-medium">Bedrohung</th>
                  <th className="px-4 py-3 font-medium">Schwachstelle</th>
                  <th className="px-4 py-3 font-medium">Risiko</th>
                  <th className="px-4 py-3 font-medium">Maßnahme</th>
                  <th className="px-4 py-3 font-medium">Pflicht</th>
                  <th className="px-4 py-3 font-medium">Frist</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Verantwortlich</th>
                  <th className="px-4 py-3 font-medium">Business Impact</th>
                  <th className="px-4 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {risks.map((r) => {
                  const linkedMeasure = measureByRiskId[r.id];
                  const obligation = resolveObligationStatus({
                    status:
                      linkedMeasure?.status ??
                      (r.risk_level === "low" ? "completed" : "open"),
                    deadline: r.deadline,
                    criticality: r.criticality,
                    isMandatory: r.is_mandatory,
                  });
                  const obligationClass =
                    obligation === "critically_overdue"
                      ? "bg-red-100 text-red-800"
                      : obligation === "overdue"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700";

                    const resolvedAsset = resolveRiskAsset(r, assets);

                    return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {resolvedAsset.name}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className="bg-slate-100 text-slate-700">
                          {resolvedAsset.categoryLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayRiskField(r.threat, RISK_FIELD_FALLBACKS.threat)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayRiskField(r.vulnerability, RISK_FIELD_FALLBACKS.vulnerability)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={LEVEL_COLORS[r.risk_level]}>{LEVEL_LABELS[r.risk_level]}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayRiskField(r.measure, RISK_FIELD_FALLBACKS.measure)}
                      </td>
                      <td className="px-4 py-4">
                        {r.is_mandatory ? (
                          <Badge className="bg-indigo-100 text-indigo-800">Ja</Badge>
                        ) : (
                          <span className="text-slate-500">Nein</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {r.deadline
                          ? formatDate(r.deadline)
                          : RISK_FIELD_FALLBACKS.deadline}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={obligationClass}>
                          {OBLIGATION_STATUS_LABELS[obligation]}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayRiskField(r.responsible, RISK_FIELD_FALLBACKS.responsible)}
                      </td>
                      <td className="max-w-[200px] px-4 py-4 text-xs text-slate-600">
                        {displayRiskField(r.business_impact, RISK_FIELD_FALLBACKS.businessImpact)}
                      </td>
                      <td className="px-4 py-4">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(r.id)}>
                          <Wand2 className="h-3.5 w-3.5" />
                          Bearbeiten
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {editingId && (
        <RiskAssistModal
          companyId={companyId}
          risk={risks.find((r) => r.id === editingId)!}
          assets={assets}
          onAssetsChange={setAssets}
          onSaved={(result) => handleAssistSaved(editingId, result)}
          onClose={() => setEditingId(null)}
        />
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
