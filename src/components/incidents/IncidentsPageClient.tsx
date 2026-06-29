"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Incident } from "@/lib/types";
import { INCIDENT_STATUS_LABELS } from "@/lib/incidents/types";
import { IncidentDetailEditor } from "@/components/incidents/IncidentDetailEditor";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { resolveObligationStatus } from "@/lib/compliance/obligations";
import { OBLIGATION_STATUS_LABELS } from "@/lib/compliance/types";
import { Loader2 } from "lucide-react";

interface IncidentsPageClientProps {
  companyId: string;
  companyName?: string;
  initialIncidents: Incident[];
}

export function IncidentsPageClient({
  companyId,
  companyName,
  initialIncidents,
}: IncidentsPageClientProps) {
  const router = useRouter();
  const [incidents, setIncidents] = useState(initialIncidents);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/generate-incident-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, title, description }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Bericht konnte nicht erstellt werden");
      setLoading(false);
      return;
    }

    setIncidents((prev) => [data.incident, ...prev]);
    setSelected(data.incident);
    setTitle("");
    setDescription("");
    setLoading(false);
    router.refresh();
  }

  function handleIncidentSaved(updated: Incident) {
    setIncidents((prev) => prev.map((inc) => (inc.id === updated.id ? updated : inc)));
    setSelected(updated);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sicherheitsvorfall melden</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Jeder gemeldete Vorfall wird als Pflichtaufgabe mit 24-Stunden-Dokumentationsfrist
            erfasst.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Titel des Vorfalls</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="z. B. Verdacht auf Ransomware"
              />
            </div>
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Was ist passiert? Welche Systeme sind betroffen?"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Wird erstellt...
                </>
              ) : (
                "Vorfallbericht generieren"
              )}
            </Button>
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {incidents.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Vorfälle ({incidents.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {incidents.map((inc) => {
                  const obligation = resolveObligationStatus({
                    status: inc.status,
                    deadline: inc.deadline,
                    criticality: inc.criticality,
                    isMandatory: inc.is_mandatory,
                  });
                  const obligationClass =
                    obligation === "critically_overdue"
                      ? "border-l-4 border-l-red-500"
                      : obligation === "overdue"
                        ? "border-l-4 border-l-amber-500"
                        : "";

                  return (
                    <li key={inc.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(inc)}
                        className={`w-full px-6 py-3 text-left text-sm hover:bg-slate-50 ${selected?.id === inc.id ? "bg-brand-50" : ""} ${obligationClass}`}
                      >
                        <p className="font-medium text-slate-900">{inc.title}</p>
                        <p className="text-xs text-slate-400">{formatDate(inc.created_at)}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge className="text-xs">{OBLIGATION_STATUS_LABELS[obligation]}</Badge>
                          <Badge className="text-xs">
                            {INCIDENT_STATUS_LABELS[inc.status] ?? inc.status}
                          </Badge>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <div className="space-y-4 lg:col-span-2">
            {selected ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{selected.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <IncidentDetailEditor
                      incident={selected}
                      companyName={companyName}
                      onSaved={handleIncidentSaved}
                    />
                  </CardContent>
                </Card>
                {selected.report_content && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ursprünglicher Vorfallbericht</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {selected.report_content}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-sm text-slate-500">
                  Wählen Sie einen Vorfall aus der Liste.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {incidents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Noch keine Sicherheitsvorfälle dokumentiert.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
