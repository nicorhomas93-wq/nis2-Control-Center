"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Incident } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Sicherheitsvorfall melden</CardTitle></CardHeader>
        <CardContent>
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
                {incidents.map((inc) => (
                  <li key={inc.id}>
                    <button
                      onClick={() => setSelected(inc)}
                      className={`w-full px-6 py-3 text-left text-sm hover:bg-slate-50 ${selected?.id === inc.id ? "bg-brand-50" : ""}`}
                    >
                      <p className="font-medium text-slate-900">{inc.title}</p>
                      <p className="text-xs text-slate-400">{formatDate(inc.created_at)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>{selected?.title ?? "Bericht"}</CardTitle></CardHeader>
            <CardContent>
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
