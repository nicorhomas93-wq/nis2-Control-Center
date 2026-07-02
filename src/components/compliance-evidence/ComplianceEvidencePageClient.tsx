"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Nis2Status } from "@/lib/types";
import type {
  ComplianceEvidenceEntryWithFiles,
  ComplianceEvidenceDashboardStats,
  EvidenceCategory,
  EvidenceEntryType,
  EvidenceExternalLink,
  EvidenceMandatoryRelevance,
  Nis2EvidenceScope,
} from "@/lib/compliance-evidence/types";
import {
  NIS2_UNKNOWN_SCOPE_MESSAGE,
  NIS2_VOLUNTARY_SCOPE_MESSAGE,
} from "@/lib/compliance-evidence/types";
import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_CATEGORY_LABELS,
  EVIDENCE_ENTRY_TYPES,
  EVIDENCE_ENTRY_TYPE_LABELS,
  EVIDENCE_STATUS_BADGE,
  EVIDENCE_STATUS_LABELS,
  MANDATORY_RELEVANCE_LABELS,
} from "@/lib/compliance-evidence/labels";
import { getNis2StatusLabel, getNis2StatusColor } from "@/lib/nis2/betroffenheit";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  GraduationCap,
  Loader2,
  Plus,
  Upload,
  Trash2,
  Save,
  ExternalLink,
  Filter,
} from "lucide-react";

interface ComplianceEvidencePageClientProps {
  companyId: string;
  companyName: string;
  nis2Status: Nis2Status;
  initialEntries: ComplianceEvidenceEntryWithFiles[];
  initialStats: ComplianceEvidenceDashboardStats;
  initialScope: Nis2EvidenceScope;
  initialScopeLabel: string;
}

export function ComplianceEvidencePageClient({
  companyId,
  nis2Status,
  initialEntries,
  initialStats,
  initialScope,
  initialScopeLabel,
}: ComplianceEvidencePageClientProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [stats, setStats] = useState(initialStats);
  const [scope, setScope] = useState(initialScope);
  const [scopeLabel, setScopeLabel] = useState(initialScopeLabel);
  const [categoryFilter, setCategoryFilter] = useState<EvidenceCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialEntries[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<EvidenceCategory>("schulungen");
  const [newEntryType, setNewEntryType] = useState<EvidenceEntryType>("schulung");
  const [newDescription, setNewDescription] = useState("");
  const [newConductedAt, setNewConductedAt] = useState("");
  const [newResponsible, setNewResponsible] = useState("");
  const [newValidUntil, setNewValidUntil] = useState("");
  const [newNextReview, setNewNextReview] = useState("");
  const [newMandatory, setNewMandatory] = useState<EvidenceMandatoryRelevance>("nis2_dependent");

  const [editDraft, setEditDraft] = useState({
    title: "",
    category: "schulungen" as EvidenceCategory,
    entryType: "schulung" as EvidenceEntryType,
    description: "",
    conductedAt: "",
    responsible: "",
    validUntil: "",
    nextReviewAt: "",
    mandatoryRelevance: "nis2_dependent" as EvidenceMandatoryRelevance,
    externalLinks: [] as EvidenceExternalLink[],
  });
  const [editing, setEditing] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const filteredEntries = useMemo(() => {
    if (categoryFilter === "all") return entries;
    return entries.filter((e) => e.category === categoryFilter);
  }, [entries, categoryFilter]);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const syncSelection = useCallback((entry: ComplianceEvidenceEntryWithFiles | null) => {
    if (!entry) return;
    setEditDraft({
      title: entry.title,
      category: entry.category,
      entryType: entry.entry_type,
      description: entry.description ?? "",
      conductedAt: entry.conducted_at?.slice(0, 10) ?? "",
      responsible: entry.responsible ?? "",
      validUntil: entry.valid_until?.slice(0, 10) ?? "",
      nextReviewAt: entry.next_review_at?.slice(0, 10) ?? "",
      mandatoryRelevance: entry.mandatory_relevance,
      externalLinks: entry.external_links ?? [],
    });
    setEditing(false);
  }, []);

  useEffect(() => {
    if (selected) syncSelection(selected);
  }, [selected, syncSelection]);

  async function reload() {
    const res = await fetch(`/api/compliance-evidence?companyId=${companyId}`);
    const data = await res.json();
    if (res.ok) {
      setEntries(data.entries ?? []);
      setStats(data.stats ?? initialStats);
      setScope(data.scope ?? initialScope);
      setScopeLabel(data.scopeLabel ?? initialScopeLabel);
    }
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/compliance-evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        title: newTitle,
        category: newCategory,
        entryType: newEntryType,
        description: newDescription,
        conductedAt: newConductedAt || null,
        responsible: newResponsible,
        validUntil: newValidUntil || null,
        nextReviewAt: newNextReview || null,
        mandatoryRelevance: newMandatory,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Anlegen fehlgeschlagen");
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewConductedAt("");
    setNewResponsible("");
    setNewValidUntil("");
    setNewNextReview("");
    await reload();
    if (data.entry?.id) setSelectedId(data.entry.id);
    setFeedback("Nachweis-Eintrag angelegt.");
  }

  async function handleUpdate() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/compliance-evidence/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        title: editDraft.title,
        category: editDraft.category,
        entryType: editDraft.entryType,
        description: editDraft.description,
        conductedAt: editDraft.conductedAt || null,
        responsible: editDraft.responsible,
        validUntil: editDraft.validUntil || null,
        nextReviewAt: editDraft.nextReviewAt || null,
        mandatoryRelevance: editDraft.mandatoryRelevance,
        externalLinks: editDraft.externalLinks,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen");
      return;
    }
    setEditing(false);
    setFeedback("Eintrag gespeichert.");
    await reload();
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`„${selected.title}" wirklich löschen?`)) return;
    setSaving(true);
    const res = await fetch(`/api/compliance-evidence/${selected.id}?companyId=${companyId}`, {
      method: "DELETE",
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Löschen fehlgeschlagen");
      return;
    }
    setSelectedId(null);
    setFeedback("Eintrag entfernt.");
    await reload();
  }

  async function handleUpload(file: File) {
    if (!selected) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("companyId", companyId);
    form.append("file", file);
    const res = await fetch(`/api/compliance-evidence/${selected.id}/files`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload fehlgeschlagen");
      return;
    }
    setFeedback(`Datei „${file.name}" hochgeladen (Version ${data.file?.version}).`);
    await reload();
    setSelectedId(selected.id);
  }

  function addExternalLink() {
    if (!newLinkUrl.trim()) return;
    setEditDraft((d) => ({
      ...d,
      externalLinks: [
        ...d.externalLinks,
        { label: newLinkLabel.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() },
      ],
    }));
    setNewLinkLabel("");
    setNewLinkUrl("");
  }

  const displayStatus = (entry: ComplianceEvidenceEntryWithFiles) =>
    (entry as ComplianceEvidenceEntryWithFiles & { computedStatus?: string }).computedStatus ??
    entry.status;

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">NIS2-Betroffenheit & Pflichtlogik</CardTitle>
          <CardDescription>
            Status:{" "}
            <Badge className={getNis2StatusColor(nis2Status)}>{getNis2StatusLabel(nis2Status)}</Badge>
            {" · "}
            {scopeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {scope === "voluntary" && <p>{NIS2_VOLUNTARY_SCOPE_MESSAGE}</p>}
          {scope === "unknown" && (
            <p>
              {NIS2_UNKNOWN_SCOPE_MESSAGE}{" "}
              <Link href="/assessment" className="font-medium text-brand-600 hover:underline">
                Betroffenheitscheck starten
              </Link>
            </p>
          )}
          {scope === "mandatory" && (
            <p>
              Als NIS2-betroffenes Unternehmen können fehlende oder abgelaufene Pflichtnachweise
              Audit-Bereitschaft, Datenqualität und Aufgabenstatus beeinflussen.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Einträge gesamt</p>
            <p className="text-2xl font-bold">{stats.totalEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Vollständig</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.completeEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Fehlende Nachweise</p>
            <p className="text-2xl font-bold text-red-700">{stats.missingEvidence}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Reviews fällig</p>
            <p className="text-2xl font-bold text-amber-700">{stats.reviewsDue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Abgelaufen</p>
            <p className="text-2xl font-bold text-orange-700">{stats.expiredEntries}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as EvidenceCategory | "all")
          }
        >
          <option value="all">Alle Kategorien</option>
          {EVIDENCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EVIDENCE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4" />
              Neuer Eintrag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label htmlFor="ev-title">Titel</Label>
                <Input
                  id="ev-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="z. B. MFA-Sicherheitsschulung 2026"
                  required
                />
              </div>
              <div>
                <Label>Kategorie</Label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as EvidenceCategory)}
                >
                  {EVIDENCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {EVIDENCE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Typ</Label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newEntryType}
                  onChange={(e) => setNewEntryType(e.target.value as EvidenceEntryType)}
                >
                  {EVIDENCE_ENTRY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {EVIDENCE_ENTRY_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Pflichtrelevant</Label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newMandatory}
                  onChange={(e) =>
                    setNewMandatory(e.target.value as EvidenceMandatoryRelevance)
                  }
                >
                  {Object.entries(MANDATORY_RELEVANCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Durchführungsdatum</Label>
                <Input
                  type="date"
                  value={newConductedAt}
                  onChange={(e) => setNewConductedAt(e.target.value)}
                />
              </div>
              <div>
                <Label>Verantwortlicher</Label>
                <Input
                  value={newResponsible}
                  onChange={(e) => setNewResponsible(e.target.value)}
                />
              </div>
              <div>
                <Label>Gültig bis</Label>
                <Input
                  type="date"
                  value={newValidUntil}
                  onChange={(e) => setNewValidUntil(e.target.value)}
                />
              </div>
              <div>
                <Label>Nächster Review</Label>
                <Input
                  type="date"
                  value={newNextReview}
                  onChange={(e) => setNewNextReview(e.target.value)}
                />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Eintrag anlegen
              </Button>
            </form>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-slate-700">Einträge</p>
              {filteredEntries.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine Einträge.</p>
              ) : (
                filteredEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedId === entry.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{entry.title}</span>
                      <Badge className={EVIDENCE_STATUS_BADGE[displayStatus(entry)]}>
                        {EVIDENCE_STATUS_LABELS[displayStatus(entry) as keyof typeof EVIDENCE_STATUS_LABELS] ??
                          displayStatus(entry)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {EVIDENCE_CATEGORY_LABELS[entry.category]} ·{" "}
                      {entry.files.filter((f) => f.is_current).length} Datei(en)
                    </p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selected.title}</CardTitle>
                    <CardDescription>
                      {EVIDENCE_CATEGORY_LABELS[selected.category]} ·{" "}
                      {EVIDENCE_ENTRY_TYPE_LABELS[selected.entry_type]}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
                      {editing ? "Abbrechen" : "Bearbeiten"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDelete()}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge className={EVIDENCE_STATUS_BADGE[displayStatus(selected)]}>
                  {EVIDENCE_STATUS_LABELS[displayStatus(selected) as keyof typeof EVIDENCE_STATUS_LABELS]}
                </Badge>

                {editing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Titel</Label>
                      <Input
                        value={editDraft.title}
                        onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Kategorie</Label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={editDraft.category}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            category: e.target.value as EvidenceCategory,
                          }))
                        }
                      >
                        {EVIDENCE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {EVIDENCE_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Typ</Label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={editDraft.entryType}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            entryType: e.target.value as EvidenceEntryType,
                          }))
                        }
                      >
                        {EVIDENCE_ENTRY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {EVIDENCE_ENTRY_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Externe Links</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Input
                          placeholder="Bezeichnung"
                          value={newLinkLabel}
                          onChange={(e) => setNewLinkLabel(e.target.value)}
                          className="max-w-[140px]"
                        />
                        <Input
                          placeholder="https://…"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          className="min-w-[180px] flex-1"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addExternalLink}>
                          Link hinzufügen
                        </Button>
                      </div>
                      {editDraft.externalLinks.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {editDraft.externalLinks.map((link, i) => (
                            <li key={`${link.url}-${i}`} className="flex items-center gap-2">
                              <ExternalLink className="h-3 w-3" />
                              <a href={link.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                                {link.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Button onClick={() => void handleUpdate()} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Speichern
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    {selected.description && <p className="sm:col-span-2">{selected.description}</p>}
                    {selected.conducted_at && <p>Durchführung: {formatDate(selected.conducted_at)}</p>}
                    {selected.responsible && <p>Verantwortlich: {selected.responsible}</p>}
                    {selected.valid_until && <p>Gültig bis: {formatDate(selected.valid_until)}</p>}
                    {selected.next_review_at && (
                      <p>Nächster Review: {formatDate(selected.next_review_at)}</p>
                    )}
                    <p>Pflicht: {MANDATORY_RELEVANCE_LABELS[selected.mandatory_relevance]}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dateien & Upload</CardTitle>
                <CardDescription>PDF, DOCX, XLSX, CSV, PNG, JPG, TXT, ZIP (max. 25 MB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Wird hochgeladen…" : "Datei auswählen oder hierher ziehen"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.txt,.zip"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>

                {selected.files.length === 0 ? (
                  <p className="text-sm text-slate-500">Noch keine Dateien hochgeladen.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.files
                      .filter((f) => f.is_current)
                      .map((file) => (
                        <li
                          key={file.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{file.file_name}</p>
                            <p className="text-xs text-slate-500">
                              v{file.version} · {formatDate(file.uploaded_at)}
                              {file.file_size
                                ? ` · ${Math.round(file.file_size / 1024)} KB`
                                : ""}
                            </p>
                          </div>
                          {file.file_url && (
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:underline"
                            >
                              Öffnen
                            </a>
                          )}
                        </li>
                      ))}
                  </ul>
                )}

                {selected.files.some((f) => !f.is_current) && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-500">Ältere Versionen</p>
                    <ul className="space-y-1 text-xs text-slate-500">
                      {selected.files
                        .filter((f) => !f.is_current)
                        .map((file) => (
                          <li key={file.id}>
                            {file.file_name} (v{file.version}, archiviert)
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Eintrag auswählen oder neu anlegen.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
