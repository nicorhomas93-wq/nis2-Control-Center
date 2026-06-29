"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CompanyAsset, Risk } from "@/lib/types";
import type { MeasureSuggestion } from "@/lib/measures/suggestions";
import { validateMeasureTitle } from "@/lib/measures/naming";
import { resolveRiskAsset } from "@/lib/assets/resolve";
import { AssetPicker } from "@/components/assets/AssetPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  CheckCircle2,
  FileUp,
  ListPlus,
  Loader2,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

interface ScoreImpact {
  securityPoints: number;
  auditPoints: number;
  label: string;
}

interface RiskAssistModalProps {
  companyId: string;
  risk: Risk;
  assets: CompanyAsset[];
  onAssetsChange: (assets: CompanyAsset[]) => void;
  onSaved: (updatedRisk: Partial<Risk>) => void;
  onClose: () => void;
}

export function RiskAssistModal({
  companyId,
  risk,
  assets,
  onAssetsChange,
  onSaved,
  onClose,
}: RiskAssistModalProps) {
  const router = useRouter();
  const resolved = resolveRiskAsset(risk, assets);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MeasureSuggestion[]>([]);
  const [scoreImpact, setScoreImpact] = useState<ScoreImpact | null>(null);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);

  const [assetId, setAssetId] = useState(risk.asset_id ?? null);
  const [measureTitle, setMeasureTitle] = useState("");
  const [measureWarning, setMeasureWarning] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  const [responsible, setResponsible] = useState("");
  const [vulnerability, setVulnerability] = useState(risk.vulnerability ?? "");
  const [businessImpact, setBusinessImpact] = useState(risk.business_impact ?? "");
  const [isMandatory, setIsMandatory] = useState(Boolean(risk.is_mandatory));
  const [criticality, setCriticality] = useState(risk.criticality ?? "medium");
  const [escalationLevel, setEscalationLevel] = useState(String(risk.escalation_level ?? 0));
  const [editMode, setEditMode] = useState(false);

  const loadAssist = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/risks/assist?riskId=${risk.id}&companyId=${companyId}`
    );
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Assistenz konnte nicht geladen werden");
      return;
    }
    setSuggestions(data.suggestions ?? []);
    setScoreImpact(data.scoreImpact ?? null);
    const prefill = data.prefill;
    if (prefill) {
      setMeasureTitle(prefill.measure ?? "");
      setDeadline(prefill.deadline ?? "");
      setResponsible(prefill.responsible ?? "");
      setIsMandatory(Boolean(prefill.isMandatory));
      setCriticality(prefill.criticality ?? "medium");
    }
    setSelectedSuggestionIdx(0);
  }, [companyId, risk.id]);

  useEffect(() => {
    loadAssist();
  }, [loadAssist]);

  function handleMeasureChange(value: string) {
    setMeasureTitle(value);
    setEditMode(true);
    const check = validateMeasureTitle(value);
    setMeasureWarning(check.warning);
  }

  function applySuggestion(idx: number, adapt = false) {
    const s = suggestions[idx];
    if (!s) return;
    setSelectedSuggestionIdx(idx);
    setMeasureTitle(s.title);
    setMeasureWarning(null);
    setEditMode(adapt);
  }

  async function submit(action: string) {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/risks/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riskId: risk.id,
        companyId,
        measureTitle,
        assetId,
        deadline: deadline || null,
        responsible,
        vulnerability,
        businessImpact,
        isMandatory,
        criticality,
        escalationLevel: Number(escalationLevel) || 0,
        action,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen");
      if (data.error?.includes("Problem")) setMeasureWarning(data.error);
      return;
    }

    onSaved({
      measure: measureTitle,
      asset_id: assetId,
      responsible,
      deadline: deadline || null,
      vulnerability,
      business_impact: businessImpact,
      is_mandatory: isMandatory,
      criticality,
    });

    if (data.redirectTo) {
      router.push(data.redirectTo);
    } else {
      router.refresh();
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <Card className="relative w-full max-w-3xl shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>

        <CardHeader className="border-b border-slate-100 pr-12">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <CardTitle>Risiko-Assistenz</CardTitle>
          </div>
          <p className="text-sm text-slate-600">
            {resolved.name} — {risk.threat}
          </p>
          {risk.vulnerability && (
            <p className="text-xs text-slate-500">Schwachstelle: {risk.vulnerability}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Passende Maßnahmen werden analysiert…
            </div>
          ) : (
            <>
              {scoreImpact && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-emerald-800">
                    <TrendingUp className="h-4 w-4" />
                    <p className="font-semibold">Wirkung dieser Maßnahme</p>
                  </div>
                  <p className="text-sm text-emerald-900">
                    +{scoreImpact.securityPoints} Punkte Security Score · +
                    {scoreImpact.auditPoints} Punkte Audit-Bereitschaft
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Basis: {scoreImpact.label} — bei Umsetzung und Dokumentation
                  </p>
                </div>
              )}

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">
                  Vorgeschlagene Maßnahmen
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {suggestions.map((s, idx) => (
                    <li
                      key={s.title}
                      className={`rounded-xl border p-4 transition-colors ${
                        selectedSuggestionIdx === idx
                          ? "border-brand-400 bg-brand-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900">{s.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{s.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => applySuggestion(idx, false)}
                        >
                          Übernehmen
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => applySuggestion(idx, true)}
                        >
                          Anpassen
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {editMode ? "Maßnahme anpassen" : "Ausgewählte Maßnahme"}
                </p>
                <div>
                  <Label htmlFor="measure-title">Maßnahme</Label>
                  <Input
                    id="measure-title"
                    value={measureTitle}
                    onChange={(e) => handleMeasureChange(e.target.value)}
                    placeholder="Konkrete Handlung formulieren…"
                  />
                  {measureWarning && (
                    <div className="mt-2 space-y-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <p>{measureWarning}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const idx = selectedSuggestionIdx;
                          applySuggestion(idx >= 0 ? idx : 0, false);
                        }}
                      >
                        Vorschlag generieren
                      </Button>
                    </div>
                  )}
                </div>

                <AssetPicker
                  companyId={companyId}
                  assets={assets}
                  value={assetId}
                  onChange={(id) => setAssetId(id)}
                  onAssetsChange={onAssetsChange}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Frist</Label>
                    <Input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Verantwortlich</Label>
                    <Input
                      value={responsible}
                      onChange={(e) => setResponsible(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Kritikalität</Label>
                    <Select
                      value={criticality}
                      onChange={(e) => setCriticality(e.target.value)}
                    >
                      <option value="low">Niedrig</option>
                      <option value="medium">Mittel</option>
                      <option value="high">Hoch</option>
                      <option value="critical">Kritisch</option>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      checked={isMandatory}
                      onChange={(e) => setIsMandatory(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <Label>Pflichtaufgabe</Label>
                  </div>
                </div>

                <div>
                  <Label>Schwachstelle</Label>
                  <Input
                    value={vulnerability}
                    onChange={(e) => setVulnerability(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Business Impact</Label>
                  <Input
                    value={businessImpact}
                    onChange={(e) => setBusinessImpact(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Schnellaktionen
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={saving || !measureTitle.trim()}
                    onClick={() => submit("save_and_complete")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Übernehmen & als erledigt markieren
                  </Button>
                  <Button
                    variant="outline"
                    disabled={saving || !measureTitle.trim()}
                    onClick={() => submit("save_and_task")}
                  >
                    <ListPlus className="h-4 w-4" />
                    Zur Aufgabenliste hinzufügen
                  </Button>
                  <Button
                    variant="outline"
                    disabled={saving || !measureTitle.trim()}
                    onClick={() => submit("upload_evidence")}
                  >
                    <FileUp className="h-4 w-4" />
                    Nachweis dokumentieren
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={saving || !measureTitle.trim() || Boolean(measureWarning)}
                    onClick={() => submit("save")}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Speichern…
                      </>
                    ) : (
                      "Speichern & Score aktualisieren"
                    )}
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    Abbrechen
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Beim Speichern werden Risiko und Maßnahme verknüpft, der Security Score neu
                  berechnet und ein Ereignis protokolliert.{" "}
                  <Link href="/documents" className="text-brand-600 hover:underline">
                    Dokumente / Nachweise
                  </Link>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
