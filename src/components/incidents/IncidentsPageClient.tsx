"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Incident, IncidentStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { resolveObligationStatus } from "@/lib/compliance/obligations";
import { OBLIGATION_STATUS_LABELS } from "@/lib/compliance/types";
import { Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  investigating: "In Bearbeitung",
  resolved: "Erledigt",
  closed: "Geschlossen",
};

interface IncidentsPageClientProps {
  companyId: string;
  initialIncidents: Incident[];
}

export function IncidentsPageClient({ companyId, initialIncidents }: IncidentsPageClientProps) {
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

  async function updateIncident(id: string, fields: Record<string, unknown>) {
    const res = await fetch("/api/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    if (!res.ok) return;
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, ...fields } as Incident : inc))
    );
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, ...fields } as Incident : prev));
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Sicherheitsvorfall melden</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Jeder gemeldete Vorfall wird als Pflichtaufgabe mit 24-Stunden-Dokumentationsfrist erfasst.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Titel des Vorfalls</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="z. B. Verdacht auf Ransomware" />
            </div>
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Was ist passiert? Welche Systeme sind betroffen?" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird erstellt...</> : "Vorfallbericht generieren"}
            </Button>
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </form>
        </CardContent>
      </Card>

      {incidents.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Vorfälle ({incidents.length})</CardTitle></CardHeader>
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
                        onClick={() => setSelected(inc)}
                        className={`w-full px-6 py-3 text-left text-sm hover:bg-slate-50 ${selected?.id === inc.id ? "bg-brand-50" : ""} ${obligationClass}`}
                      >
                        <p className="font-medium text-slate-900">{inc.title}</p>
                        <p className="text-xs text-slate-400">{formatDate(inc.created_at)}</p>
                        <Badge className="mt-1 text-xs">
                          {OBLIGATION_STATUS_LABELS[obligation]}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>{selected?.title ?? "Bericht"}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {selected && (
                <IncidentObligationPanel incident={selected} onUpdate={updateIncident} />
              )}
              {selected?.report_content ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selected.report_content}</div>
              ) : (
                <p className="text-sm text-slate-500">Wählen Sie einen Vorfall aus der Liste.</p>
              )}
            </CardContent>
          </Card>
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

function IncidentObligationPanel({
  incident,
  onUpdate,
}: {
  incident: Incident;
  onUpdate: (id: string, fields: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [criticality, setCriticality] = useState(incident.criticality ?? "high");
  const [deadline, setDeadline] = useState(incident.deadline?.slice(0, 16) ?? "");
  const [responsible, setResponsible] = useState(incident.responsible ?? "");
  const [escalationLevel, setEscalationLevel] = useState(String(incident.escalation_level ?? 0));

  const obligation = resolveObligationStatus({
    status,
    deadline: deadline || incident.deadline,
    criticality,
    isMandatory: incident.is_mandatory,
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Pflicht & Bearbeitung</p>
        <Badge>
          {OBLIGATION_STATUS_LABELS[obligation]} · {STATUS_LABELS[status] ?? status}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Bearbeitungsstatus</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus)}>
            <option value="open">Offen</option>
            <option value="investigating">In Bearbeitung</option>
            <option value="resolved">Erledigt</option>
            <option value="closed">Geschlossen</option>
          </Select>
        </div>
        <div>
          <Label>Kritikalität</Label>
          <Select value={criticality} onChange={(e) => setCriticality(e.target.value)}>
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
            <option value="critical">Kritisch</option>
          </Select>
        </div>
        <div>
          <Label>Dokumentationsfrist</Label>
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div>
          <Label>Verantwortlich</Label>
          <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} />
        </div>
        <div>
          <Label>Eskalationsstufe</Label>
          <Input
            type="number"
            min={0}
            max={5}
            value={escalationLevel}
            onChange={(e) => setEscalationLevel(e.target.value)}
          />
        </div>
      </div>
      <Button
        size="sm"
        className="mt-3"
        onClick={() =>
          onUpdate(incident.id, {
            status,
            criticality,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            responsible: responsible || null,
            escalation_level: Number(escalationLevel) || 0,
          })
        }
      >
        Status speichern
      </Button>
    </div>
  );
}
