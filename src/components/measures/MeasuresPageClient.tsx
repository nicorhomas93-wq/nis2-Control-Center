"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyAsset, Measure, MeasurePriority, MeasureStatus, Risk } from "@/lib/types";
import { validateMeasureTitle } from "@/lib/measures/naming";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Plus } from "lucide-react";
import { resolveObligationStatus } from "@/lib/compliance/obligations";
import { OBLIGATION_STATUS_LABELS } from "@/lib/compliance/types";

const STATUS_LABELS: Record<MeasureStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  completed: "Umgesetzt",
};

const PRIORITY_LABELS: Record<MeasurePriority, string> = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

const STATUS_COLORS: Record<MeasureStatus, string> = {
  open: "bg-red-100 text-red-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const PRIORITY_COLORS: Record<MeasurePriority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
};

interface MeasuresPageClientProps {
  companyId: string;
  initialMeasures: Measure[];
  initialRisks: Risk[];
  initialAssets: CompanyAsset[];
}

export function MeasuresPageClient({
  companyId,
  initialMeasures,
  initialRisks,
  initialAssets,
}: MeasuresPageClientProps) {
  const router = useRouter();
  const [measures, setMeasures] = useState(initialMeasures);
  const [risks] = useState(initialRisks);
  const [assets] = useState(initialAssets);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MeasurePriority>("medium");
  const [responsible, setResponsible] = useState("");
  const [targetState, setTargetState] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [criticality, setCriticality] = useState("medium");
  const [deadline, setDeadline] = useState("");
  const [selectedRiskId, setSelectedRiskId] = useState("");
  const [titleWarning, setTitleWarning] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleTitleChange(value: string) {
    setTitle(value);
    const check = validateMeasureTitle(value);
    setTitleWarning(check.warning);
  }

  async function suggestMeasure() {
    setSuggesting(true);
    const res = await fetch("/api/measures/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        riskId: selectedRiskId || undefined,
      }),
    });
    const data = await res.json();
    setSuggesting(false);
    if (!res.ok) return;
    handleTitleChange(data.suggestion.title);
    setDescription(data.suggestion.description ?? "");
    setTargetState(data.suggestion.target_state ?? "");
  }

  async function addMeasure(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const selectedRisk = risks.find((r) => r.id === selectedRiskId);

    const res = await fetch("/api/measures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        title,
        description,
        priority,
        responsible,
        target_state: targetState,
        is_mandatory: isMandatory,
        criticality,
        deadline: deadline || null,
        risk_id: selectedRiskId || null,
        asset_id: selectedRisk?.asset_id ?? null,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMeasures((prev) => [data.measure, ...prev]);
      setTitle("");
      setDescription("");
      setResponsible("");
      setTargetState("");
      setIsMandatory(false);
      setCriticality("medium");
      setDeadline("");
      setSelectedRiskId("");
      setTitleWarning(null);
      setShowForm(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: MeasureStatus) {
    const res = await fetch("/api/measures", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      setMeasures((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m))
      );
      router.refresh();
    }
  }

  const stats = {
    open: measures.filter((m) => m.status === "open").length,
    in_progress: measures.filter((m) => m.status === "in_progress").length,
    completed: measures.filter((m) => m.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {(["open", "in_progress", "completed"] as MeasureStatus[]).map(
          (status) => (
            <Card key={status}>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">
                  {STATUS_LABELS[status]}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats[status]}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Maßnahme hinzufügen
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Neue Maßnahme</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addMeasure} className="space-y-4">
              {risks.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="risk-select">Bezug-Risiko (optional)</Label>
                    <Select
                      id="risk-select"
                      value={selectedRiskId}
                      onChange={(e) => setSelectedRiskId(e.target.value)}
                    >
                      <option value="">Kein Risiko ausgewählt</option>
                      {risks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.asset} — {r.threat}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={suggesting}
                    onClick={suggestMeasure}
                  >
                    {suggesting ? "Wird vorgeschlagen…" : "Maßnahme vorschlagen"}
                  </Button>
                </div>
              )}
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  placeholder="z. B. MFA für alle Konten aktivieren und dokumentieren"
                />
                {titleWarning && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {titleWarning}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="priority">Priorität</Label>
                  <Select
                    id="priority"
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as MeasurePriority)
                    }
                  >
                    <option value="high">Hoch</option>
                    <option value="medium">Mittel</option>
                    <option value="low">Niedrig</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="responsible">Verantwortlichkeit</Label>
                  <Input
                    id="responsible"
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    placeholder="z. B. IT-Leitung"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="target_state">Zielzustand</Label>
                <Input
                  id="target_state"
                  value={targetState}
                  onChange={(e) => setTargetState(e.target.value)}
                  placeholder="z. B. MFA für alle Benutzer aktiv"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="criticality">Kritikalität</Label>
                  <Select
                    id="criticality"
                    value={criticality}
                    onChange={(e) => setCriticality(e.target.value)}
                  >
                    <option value="low">Niedrig</option>
                    <option value="medium">Mittel</option>
                    <option value="high">Hoch</option>
                    <option value="critical">Kritisch</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Pflichtaufgabe (Audit-relevant)
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? "Wird gespeichert..." : "Maßnahme speichern"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Maßnahmenliste</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {measures.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              Noch keine Maßnahmen erfasst. Fügen Sie die erste Maßnahme hinzu
              oder generieren Sie einen Maßnahmenplan unter Dokumente.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="px-6 py-3 font-medium">Maßnahme</th>
                    <th className="px-6 py-3 font-medium">Priorität</th>
                    <th className="px-6 py-3 font-medium">Pflicht / Frist</th>
                    <th className="px-6 py-3 font-medium">Pflichtstatus</th>
                    <th className="px-6 py-3 font-medium">Fortschritt</th>
                    <th className="px-6 py-3 font-medium">Verantwortlich</th>
                    <th className="px-6 py-3 font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {measures.map((m) => {
                    const obligation = resolveObligationStatus({
                      status: m.status,
                      deadline: m.deadline,
                      criticality: m.criticality ?? m.priority,
                      isMandatory: m.is_mandatory,
                    });
                    const obligationClass =
                      obligation === "critically_overdue"
                        ? "bg-red-100 text-red-800"
                        : obligation === "overdue"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700";

                    return (
                    <tr key={m.id}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{m.title}</p>
                        {m.description && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {m.description}
                          </p>
                        )}
                        {m.target_state && (
                          <p className="mt-1 text-xs text-brand-600">
                            Ziel: {m.target_state}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={PRIORITY_COLORS[m.priority]}>
                          {PRIORITY_LABELS[m.priority]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {m.is_mandatory ? (
                          <Badge className="bg-indigo-100 text-indigo-800">Pflicht</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {m.deadline && (
                          <p className="mt-1 text-xs text-slate-500">{m.deadline.slice(0, 10)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={obligationClass}>
                          {OBLIGATION_STATUS_LABELS[obligation]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={STATUS_COLORS[m.status]}>
                          {STATUS_LABELS[m.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {m.responsible ?? "–"}
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={m.status}
                          onChange={(e) =>
                            updateStatus(
                              m.id,
                              e.target.value as MeasureStatus
                            )
                          }
                          className="w-36"
                        >
                          <option value="open">Offen</option>
                          <option value="in_progress">In Bearbeitung</option>
                          <option value="completed">Umgesetzt</option>
                        </Select>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
