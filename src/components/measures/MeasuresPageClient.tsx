"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Measure, MeasurePriority, MeasureStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Plus } from "lucide-react";

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
}

export function MeasuresPageClient({
  companyId,
  initialMeasures,
}: MeasuresPageClientProps) {
  const router = useRouter();
  const [measures, setMeasures] = useState(initialMeasures);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MeasurePriority>("medium");
  const [responsible, setResponsible] = useState("");
  const [targetState, setTargetState] = useState("");
  const [saving, setSaving] = useState(false);

  async function addMeasure(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

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
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMeasures((prev) => [data.measure, ...prev]);
      setTitle("");
      setDescription("");
      setResponsible("");
      setTargetState("");
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
      <div className="grid gap-4 grid-cols-3">
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
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-4 grid-cols-2">
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
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Verantwortlich</th>
                    <th className="px-6 py-3 font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {measures.map((m) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
