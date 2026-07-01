"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CompanyAsset, Measure, Risk, RiskLevel } from "@/lib/types";
import type { MeasureSuggestion } from "@/lib/measures/suggestions";
import { validateMeasureTitle } from "@/lib/measures/naming";
import { RESPONSIBLE_OPTIONS } from "@/lib/measures/risk-assist";
import { emitComplianceUpdated } from "@/lib/compliance/client-sync";
import type { SecurityStatusResult } from "@/lib/compliance/types";
import { AssetPicker } from "@/components/assets/AssetPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  CheckCircle2,
  FileUp,
  ListPlus,
  Loader2,
  TrendingUp,
  X,
} from "lucide-react";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";

interface ScoreImpact {
  securityPoints: number;
  auditPoints: number;
  label: string;
}

export interface RiskAssistSaveResult {
  risk: Risk;
  measure: Measure | null;
  workflowStatus: "open" | "in_progress" | "completed";
  feedbackMessage?: string;
  scoreDelta?: number;
}

interface RiskAssistModalProps {
  companyId: string;
  risk: Risk;
  assets: CompanyAsset[];
  onAssetsChange: (assets: CompanyAsset[]) => void;
  onSaved: (result: RiskAssistSaveResult) => void;
  onClose: () => void;
}

const LEVEL_LABELS: Record<RiskLevel, string> = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="rounded-xl border border-slate-200 bg-white p-4">{children}</div>
    </section>
  );
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MeasureSuggestion[]>([]);
  const [scoreImpact, setScoreImpact] = useState<ScoreImpact | null>(null);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const [linkedMeasureId, setLinkedMeasureId] = useState<string | null>(null);

  const [assetId, setAssetId] = useState(risk.asset_id ?? null);
  const [threat, setThreat] = useState(risk.threat ?? "");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(risk.risk_level);
  const [vulnerability, setVulnerability] = useState(risk.vulnerability ?? "");
  const [measureTitle, setMeasureTitle] = useState("");
  const [measureWarning, setMeasureWarning] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<"open" | "in_progress" | "completed">("open");
  const [responsible, setResponsible] = useState("");
  const [responsibleCustom, setResponsibleCustom] = useState(false);
  const [businessImpact, setBusinessImpact] = useState(risk.business_impact ?? "");
  const [isMandatory, setIsMandatory] = useState(Boolean(risk.is_mandatory));

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
    setLinkedMeasureId(data.linkedMeasure?.id ?? null);

    const prefill = data.prefill;
    if (prefill) {
      setThreat(prefill.threat ?? risk.threat ?? "");
      setRiskLevel(prefill.riskLevel ?? risk.risk_level);
      setVulnerability(risk.vulnerability ?? "");
      setMeasureTitle(prefill.measure ?? "");
      setDeadline(prefill.deadline ?? "");
      setWorkflowStatus(prefill.workflowStatus ?? "open");
      const resp = prefill.responsible ?? "";
      const isPreset = RESPONSIBLE_OPTIONS.some((o) => o === resp);
      setResponsible(resp);
      setResponsibleCustom(Boolean(resp && !isPreset));
      setIsMandatory(Boolean(prefill.isMandatory));
    }
    setSelectedSuggestionIdx(0);
  }, [companyId, risk.id, risk.risk_level, risk.threat, risk.vulnerability]);

  useEffect(() => {
    loadAssist();
  }, [loadAssist]);

  useEffect(() => {
    setScoreImpact((prev) => {
      if (!prev) return prev;
      const next = riskLevel === "high"
        ? { securityPoints: 10, auditPoints: 5, label: "Hohes Risiko" }
        : riskLevel === "medium"
          ? { securityPoints: 5, auditPoints: 3, label: "Mittleres Risiko" }
          : { securityPoints: 3, auditPoints: 2, label: "Niedriges Risiko" };
      return next;
    });
  }, [riskLevel]);

  function handleMeasureChange(value: string) {
    setMeasureTitle(value);
    const check = validateMeasureTitle(value);
    setMeasureWarning(check.warning);
  }

  function applySuggestion(idx: number) {
    const s = suggestions[idx];
    if (!s) return;
    setSelectedSuggestionIdx(idx);
    setMeasureTitle(s.title);
    setMeasureWarning(null);
  }

  function resolveResponsible(): string {
    return responsible.trim();
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
        threat,
        riskLevel,
        measureTitle,
        measureId: linkedMeasureId,
        assetId,
        deadline: deadline || null,
        responsible: resolveResponsible(),
        vulnerability,
        businessImpact,
        isMandatory,
        workflowStatus,
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

    const savedRisk = data.risk as Risk;
    const savedMeasure = (data.measure as Measure | null) ?? null;
    const finalStatus =
      action === "save_and_complete"
        ? "completed"
        : (savedMeasure?.status as "open" | "in_progress" | "completed") ?? workflowStatus;

    if (data.securityStatus) {
      emitComplianceUpdated({
        companyId,
        securityStatus: data.securityStatus as SecurityStatusResult,
        nextSteps: data.nextSteps,
        eventTitle: data.eventTitle,
        scoreDelta: data.scoreDelta,
        feedbackMessage: data.feedbackMessage,
      });
    }

    onSaved({
      risk: savedRisk,
      measure: savedMeasure,
      workflowStatus: finalStatus,
      feedbackMessage: data.feedbackMessage,
      scoreDelta: data.scoreDelta,
    });

    if (data.redirectTo) {
      router.push(data.redirectTo);
    }
    onClose();
  }

  const responsibleValue = responsibleCustom ? "__custom__" : responsible;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="risk-edit-title"
    >
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 id="risk-edit-title" className="text-lg font-semibold text-slate-900">
              Risiko bearbeiten
            </h2>
            <p className="text-sm text-slate-500">Vorschläge übernehmen, anpassen und speichern</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Passende Maßnahmen werden analysiert…
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-6">
                <Section title="1. Kontext">
                  <div className="space-y-4">
                    <AssetPicker
                      companyId={companyId}
                      assets={assets}
                      value={assetId}
                      onChange={(id) => setAssetId(id)}
                      onAssetsChange={onAssetsChange}
                    />
                    <div>
                      <Label htmlFor="risk-threat">Risikobeschreibung</Label>
                      <Textarea
                        id="risk-threat"
                        value={threat}
                        onChange={(e) => setThreat(e.target.value)}
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="risk-level">Risiko-Level</Label>
                        <Select
                          id="risk-level"
                          value={riskLevel}
                          onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                          className="mt-1"
                        >
                          <option value="high">{LEVEL_LABELS.high}</option>
                          <option value="medium">{LEVEL_LABELS.medium}</option>
                          <option value="low">{LEVEL_LABELS.low}</option>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="vulnerability">Schwachstelle</Label>
                        <Input
                          id="vulnerability"
                          value={vulnerability}
                          onChange={(e) => setVulnerability(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="2. Maßnahmen">
                  <div className="space-y-4">
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                      {suggestions.map((s, idx) => (
                        <div
                          key={s.title}
                          className={`min-w-[220px] max-w-[260px] shrink-0 rounded-lg border p-3 ${
                            selectedSuggestionIdx === idx
                              ? "border-brand-400 bg-brand-50"
                              : "border-slate-200"
                          }`}
                        >
                          <p className="text-sm font-medium text-slate-900">{s.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{s.description}</p>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 w-full"
                            variant={selectedSuggestionIdx === idx ? "primary" : "outline"}
                            onClick={() => applySuggestion(idx)}
                          >
                            Vorschlag übernehmen
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label htmlFor="measure-title">Maßnahme</Label>
                      <Input
                        id="measure-title"
                        value={measureTitle}
                        onChange={(e) => handleMeasureChange(e.target.value)}
                        placeholder="Konkrete Handlung formulieren…"
                        className="mt-1"
                      />
                      {measureWarning && (
                        <div className="mt-2 space-y-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          <p>{measureWarning}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => applySuggestion(selectedSuggestionIdx >= 0 ? selectedSuggestionIdx : 0)}
                          >
                            Vorschlag generieren
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Section>

                <Section title="3. Pflicht & Frist">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        id="is-mandatory"
                        type="checkbox"
                        checked={isMandatory}
                        onChange={(e) => setIsMandatory(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <Label htmlFor="is-mandatory">Pflichtaufgabe</Label>
                    </div>
                    <div>
                      <Label htmlFor="deadline">Frist</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="workflow-status">Status</Label>
                      <Select
                        id="workflow-status"
                        value={workflowStatus}
                        onChange={(e) =>
                          setWorkflowStatus(e.target.value as "open" | "in_progress" | "completed")
                        }
                        className="mt-1"
                      >
                        <option value="open">Offen</option>
                        <option value="in_progress">In Bearbeitung</option>
                        <option value="completed">Erledigt</option>
                      </Select>
                    </div>
                  </div>
                </Section>

                <Section title="4. Verantwortlich">
                  <div className="space-y-3">
                    <Select
                      value={responsibleValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__custom__") {
                          setResponsibleCustom(true);
                          setResponsible("");
                        } else {
                          setResponsibleCustom(false);
                          setResponsible(val);
                        }
                      }}
                    >
                      <option value="">Bitte wählen…</option>
                      {RESPONSIBLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value="__custom__">Eigene Eingabe…</option>
                    </Select>
                    {responsibleCustom && (
                      <Input
                        value={responsible}
                        onChange={(e) => setResponsible(e.target.value)}
                        placeholder="Verantwortliche Person oder Rolle"
                      />
                    )}
                  </div>
                </Section>

                <Section title="5. Business Impact">
                  <Textarea
                    value={businessImpact}
                    onChange={(e) => setBusinessImpact(e.target.value)}
                    rows={3}
                    placeholder="Auswirkung auf Geschäftsprozesse, Daten oder Compliance…"
                  />
                </Section>

                {scoreImpact && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="mb-1 flex items-center gap-2 text-emerald-800">
                      <TrendingUp className="h-4 w-4" />
                      <p className="font-semibold">6. Wirkung</p>
                    </div>
                    <p className="text-sm text-emerald-900">
                      +{scoreImpact.securityPoints} Punkte im Security Score bei Umsetzung
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      +{scoreImpact.auditPoints} Punkte Audit-Bereitschaft · Basis: {scoreImpact.label}
                    </p>
                  </div>
                )}

                {error && (
                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                )}

                <ActivityTimeline
                  companyId={companyId}
                  entityType="risk"
                  entityId={risk.id}
                  className="border-0 shadow-none"
                />
              </div>
            </div>

            <footer className="sticky bottom-0 z-10 shrink-0 border-t border-slate-100 bg-white px-6 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Schnellaktionen
              </p>
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
                    "Speichern"
                  )}
                </Button>
                <Button variant="ghost" onClick={onClose} disabled={saving}>
                  Verwerfen
                </Button>
                <Button
                  variant="outline"
                  disabled={saving || !measureTitle.trim() || Boolean(measureWarning)}
                  onClick={() => submit("save_and_complete")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Übernehmen & erledigt
                </Button>
                <Button
                  variant="outline"
                  disabled={saving || !measureTitle.trim() || Boolean(measureWarning)}
                  onClick={() => submit("save_and_task")}
                >
                  <ListPlus className="h-4 w-4" />
                  Zur Aufgabenliste
                </Button>
                <Button
                  variant="outline"
                  disabled={saving || !measureTitle.trim() || Boolean(measureWarning)}
                  onClick={() => submit("upload_evidence")}
                >
                  <FileUp className="h-4 w-4" />
                  Nachweis dokumentieren
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Beim Speichern werden Risiko und Maßnahme verknüpft, Scores neu berechnet und ein
                Ereignis protokolliert.{" "}
                <Link href="/documents" className="text-brand-600 hover:underline">
                  Dokumente / Nachweise
                </Link>
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
