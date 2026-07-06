"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Radar, Search, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  LEAD_RESEARCH_SYSTEM_PROMPT,
  RESEARCH_OUTPUT_FIELDS,
  RESEARCH_SCORE_LABELS,
  RESEARCH_SIGNAL_STATUS_LABELS,
  RESEARCH_SIGNAL_TYPE_LABELS,
  TENDER_SOURCES,
  JOB_SOURCES,
  type ResearchSignalType,
} from "@/lib/jarvis/lead-research/constants";
import type { JarvisLeadResearchSignal } from "@/lib/types";

export function LeadResearchPanel({ signals }: { signals: JarvisLeadResearchSignal[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "new" | "converted">("all");
  const [form, setForm] = useState({
    company_name: "",
    signal_type: "tender" as ResearchSignalType,
    source_platform: "",
    source_url: "",
    title: "",
    description: "",
    industry: "",
    region: "",
  });

  const filtered = useMemo(() => {
    if (filter === "new") return signals.filter((s) => s.status === "new");
    if (filter === "converted") return signals.filter((s) => s.status === "converted");
    return signals;
  }, [signals, filter]);

  async function apiCall(url: string, method: string, body?: unknown) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Anfrage fehlgeschlagen");
      router.refresh();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
        <Radar className="mb-1 inline h-4 w-4" /> {LEAD_RESEARCH_SYSTEM_PROMPT}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quellen & Schlüsselbegriffe</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-medium text-slate-800">Ausschreibungen</p>
              <p className="text-xs text-slate-500">{TENDER_SOURCES.join(" · ")}</p>
            </div>
            <div>
              <p className="font-medium text-slate-800">Stellenanzeigen</p>
              <p className="text-xs text-slate-500">{JOB_SOURCES.join(" · ")}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-medium text-slate-800">Score-System</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-slate-600">
                {Object.entries(RESEARCH_SCORE_LABELS).map(([score, label]) => (
                  <li key={score}>
                    {score} Punkte: {label}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ausgabeformat pro Fund</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1">
            {RESEARCH_OUTPUT_FIELDS.map((f) => (
              <p key={f}>{f}:</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Signal erfassen
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => apiCall("/api/jarvis/lead-research/signals", "POST", { mode: "seed_demo" })}
        >
          Demo-Signale laden
        </Button>
        <Link
          href="/jarvis/traffic/b2b-outreach"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          → Lead Finder
        </Link>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neues Research-Signal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-slate-600">Firma *</span>
              <input
                className="w-full rounded border border-slate-200 px-3 py-2"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-600">Signal-Typ</span>
              <select
                className="w-full rounded border border-slate-200 px-3 py-2"
                value={form.signal_type}
                onChange={(e) =>
                  setForm({ ...form, signal_type: e.target.value as ResearchSignalType })
                }
              >
                {Object.entries(RESEARCH_SIGNAL_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-600">Quelle</span>
              <input
                className="w-full rounded border border-slate-200 px-3 py-2"
                value={form.source_platform}
                onChange={(e) => setForm({ ...form, source_platform: e.target.value })}
                placeholder="z.B. bund.de"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-slate-600">Titel</span>
              <input
                className="w-full rounded border border-slate-200 px-3 py-2"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-slate-600">Beschreibung</span>
              <textarea
                className="min-h-[80px] w-full rounded border border-slate-200 px-3 py-2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-600">Branche</span>
              <input
                className="w-full rounded border border-slate-200 px-3 py-2"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-600">Region</span>
              <input
                className="w-full rounded border border-slate-200 px-3 py-2"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </label>
            <div className="sm:col-span-2">
              <Button
                type="button"
                disabled={loading || !form.company_name.trim()}
                onClick={async () => {
                  const ok = await apiCall("/api/jarvis/lead-research/signals", "POST", form);
                  if (ok) {
                    setShowForm(false);
                    setForm({
                      company_name: "",
                      signal_type: "tender",
                      source_platform: "",
                      source_url: "",
                      title: "",
                      description: "",
                      industry: "",
                      region: "",
                    });
                  }
                }}
              >
                <Search className="h-4 w-4" />
                Speichern & bewerten
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 text-sm">
        {(["all", "new", "converted"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 ${filter === f ? "bg-brand-100 text-brand-800" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {f === "all" ? "Alle" : f === "new" ? "Neu" : "Übernommen"} (
            {f === "all"
              ? signals.length
              : signals.filter((s) => s.status === (f === "new" ? "new" : "converted")).length}
            )
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          Noch keine Signale. Demo laden oder manuell erfassen.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((signal) => (
            <Card key={signal.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{signal.company_name}</CardTitle>
                  <Badge className="bg-brand-100 text-brand-800 shrink-0">
                    {signal.research_score} Pkt
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {RESEARCH_SIGNAL_TYPE_LABELS[signal.signal_type as ResearchSignalType] ??
                    signal.signal_type}
                  {signal.source_platform ? ` · ${signal.source_platform}` : ""}
                  {signal.industry_priority ? ` · Priorität ${signal.industry_priority}` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {signal.title && <p className="font-medium text-slate-800">{signal.title}</p>}
                {signal.description && (
                  <p className="text-slate-600 line-clamp-4">{signal.description}</p>
                )}
                {signal.score_reason && (
                  <p className="text-xs text-brand-700">{signal.score_reason}</p>
                )}
                <p className="text-xs text-slate-400">
                  {RESEARCH_SIGNAL_STATUS_LABELS[signal.status] ?? signal.status}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {signal.status !== "converted" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading}
                      onClick={() =>
                        apiCall(
                          `/api/jarvis/lead-research/signals/${signal.id}/convert`,
                          "POST"
                        )
                      }
                    >
                      <UserPlus className="h-4 w-4" />
                      Als Lead übernehmen
                    </Button>
                  )}
                  {signal.source_url && (
                    <a
                      href={signal.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-700 hover:underline self-center"
                    >
                      Quelle öffnen
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
