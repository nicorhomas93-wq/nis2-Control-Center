"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Nis2Status } from "@/lib/types";
import type {
  ComplianceEvidenceEntryWithFiles,
  ComplianceEvidenceDashboardStats,
  EvidenceCategory,
  EvidenceEntryStatus,
  EvidenceEntryType,
  EvidenceExternalLink,
  EvidenceMandatoryRelevance,
  Nis2EvidenceScope,
  ReviewInterval,
} from "@/lib/compliance-evidence/types";
import {
  NIS2_MANDATORY_SCOPE_MESSAGE,
  NIS2_UNKNOWN_SCOPE_MESSAGE,
  NIS2_VOLUNTARY_SCOPE_MESSAGE,
} from "@/lib/compliance-evidence/types";
import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_CATEGORY_LABELS,
  EVIDENCE_ENTRY_TYPES,
  EVIDENCE_ENTRY_TYPE_LABELS,
  EVIDENCE_STATUSES,
  EVIDENCE_STATUS_BADGE,
  EVIDENCE_STATUS_LABELS,
  MANDATORY_RELEVANCE_LABELS,
  REVIEW_INTERVAL_LABELS,
} from "@/lib/compliance-evidence/labels";
import { getNis2StatusLabel, getNis2StatusColor } from "@/lib/nis2/betroffenheit";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { EvidenceTemplatesModal } from "@/components/compliance-evidence/EvidenceTemplatesModal";
import {
  EvidenceLinkFields,
  type EvidenceLinkOptions,
} from "@/components/compliance-evidence/EvidenceLinkFields";
import { EvidenceActivityPanel } from "@/components/compliance-evidence/EvidenceActivityPanel";
import {
  GraduationCap,
  Loader2,
  Plus,
  Upload,
  Trash2,
  Save,
  ExternalLink,
  Filter,
  FileStack,
  Download,
  Link2,
  Clock,
  History,
  CheckCircle2,
  FileWarning,
  CalendarClock,
  AlertTriangle,
  FileText,
  ShieldCheck,
} from "lucide-react";

type ModuleSection =
  | "overview"
  | "new"
  | "templates"
  | "files"
  | "detail"
  | "links"
  | "review"
  | "export"
  | "activity";

type DetailTab = "detail" | "files" | "links" | "review" | "activity";

interface LinkState {
  linkedRiskIds: string[];
  linkedMeasureIds: string[];
  linkedTaskIds: string[];
  linkedIncidentIds: string[];
  linkedVendorIds: string[];
  linkedAuditAreas: string[];
}

const EMPTY_LINKS: LinkState = {
  linkedRiskIds: [],
  linkedMeasureIds: [],
  linkedTaskIds: [],
  linkedIncidentIds: [],
  linkedVendorIds: [],
  linkedAuditAreas: [],
};

interface ComplianceEvidencePageClientProps {
  companyId: string;
  companyName: string;
  nis2Status: Nis2Status;
  initialEntries: ComplianceEvidenceEntryWithFiles[];
  initialStats: ComplianceEvidenceDashboardStats;
  initialScope: Nis2EvidenceScope;
  initialScopeLabel: string;
  linkOptions: EvidenceLinkOptions;
}

const MODULE_SECTIONS: { id: ModuleSection; label: string }[] = [
  { id: "overview", label: "Übersicht" },
  { id: "new", label: "Neuer Eintrag" },
  { id: "templates", label: "Vorlagen" },
  { id: "files", label: "Datei-Upload" },
  { id: "detail", label: "Detailansicht" },
  { id: "links", label: "Verknüpfungen" },
  { id: "review", label: "Review & Wiedervorlagen" },
  { id: "export", label: "Audit-Export" },
  { id: "activity", label: "Aktivitätsverlauf" },
];

export function ComplianceEvidencePageClient({
  companyId,
  nis2Status,
  initialEntries,
  initialStats,
  initialScope,
  initialScopeLabel,
  linkOptions,
}: ComplianceEvidencePageClientProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [stats, setStats] = useState(initialStats);
  const [scope, setScope] = useState(initialScope);
  const [scopeLabel, setScopeLabel] = useState(initialScopeLabel);
  const [categoryFilter, setCategoryFilter] = useState<EvidenceCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialEntries[0]?.id ?? null);
  const [activeSection, setActiveSection] = useState<ModuleSection>("overview");
  const [detailTab, setDetailTab] = useState<DetailTab>("detail");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateLoadingKey, setTemplateLoadingKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
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
  const [newParticipantsTarget, setNewParticipantsTarget] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newParticipantCount, setNewParticipantCount] = useState("");
  const [newValidUntil, setNewValidUntil] = useState("");
  const [newNextReview, setNewNextReview] = useState("");
  const [newReviewInterval, setNewReviewInterval] = useState<ReviewInterval>("none");
  const [newMandatory, setNewMandatory] = useState<EvidenceMandatoryRelevance>("nis2_dependent");
  const [newStatus, setNewStatus] = useState<EvidenceEntryStatus>("nachweis_fehlt");
  const [newLinks, setNewLinks] = useState<LinkState>(EMPTY_LINKS);

  const [editDraft, setEditDraft] = useState({
    title: "",
    category: "schulungen" as EvidenceCategory,
    entryType: "schulung" as EvidenceEntryType,
    description: "",
    conductedAt: "",
    responsible: "",
    participantsTarget: "",
    department: "",
    participantCount: "",
    validUntil: "",
    nextReviewAt: "",
    reviewInterval: "none" as ReviewInterval,
    mandatoryRelevance: "nis2_dependent" as EvidenceMandatoryRelevance,
    status: "nachweis_fehlt" as EvidenceEntryStatus,
    externalLinks: [] as EvidenceExternalLink[],
    links: EMPTY_LINKS,
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
      participantsTarget: entry.participants_target ?? "",
      department: entry.department ?? "",
      participantCount: entry.participant_count != null ? String(entry.participant_count) : "",
      validUntil: entry.valid_until?.slice(0, 10) ?? "",
      nextReviewAt: entry.next_review_at?.slice(0, 10) ?? "",
      reviewInterval: entry.review_interval ?? "none",
      mandatoryRelevance: entry.mandatory_relevance,
      status: entry.status,
      externalLinks: entry.external_links ?? [],
      links: {
        linkedRiskIds: entry.linked_risk_ids ?? [],
        linkedMeasureIds: entry.linked_measure_ids ?? [],
        linkedTaskIds: entry.linked_task_ids ?? [],
        linkedIncidentIds: entry.linked_incident_ids ?? [],
        linkedVendorIds: entry.linked_vendor_ids ?? [],
        linkedAuditAreas: entry.linked_audit_areas ?? [],
      },
    });
    setEditing(false);
  }, []);

  useEffect(() => {
    if (selected) syncSelection(selected);
  }, [selected, syncSelection]);

  function navigateSection(section: ModuleSection) {
    setActiveSection(section);
    if (section === "templates") setTemplatesOpen(true);
    if (section === "new") setActiveSection("new");
    if (section === "files" || section === "detail" || section === "links" || section === "review" || section === "activity") {
      const tabMap: Partial<Record<ModuleSection, DetailTab>> = {
        detail: "detail",
        files: "files",
        links: "links",
        review: "review",
        activity: "activity",
      };
      if (tabMap[section]) setDetailTab(tabMap[section]!);
    }
    if (section === "export") void handleAuditExport();
  }

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
        participantsTarget: newParticipantsTarget,
        department: newDepartment,
        participantCount: newParticipantCount ? Number(newParticipantCount) : null,
        validUntil: newValidUntil || null,
        nextReviewAt: newNextReview || null,
        reviewInterval: newReviewInterval,
        mandatoryRelevance: newMandatory,
        status: newStatus,
        ...newLinks,
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
    setNewParticipantsTarget("");
    setNewDepartment("");
    setNewParticipantCount("");
    setNewValidUntil("");
    setNewNextReview("");
    setNewLinks(EMPTY_LINKS);
    await reload();
    if (data.entry?.id) {
      setSelectedId(data.entry.id);
      setDetailTab("detail");
      setActiveSection("detail");
    }
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
        participantsTarget: editDraft.participantsTarget,
        department: editDraft.department,
        participantCount: editDraft.participantCount ? Number(editDraft.participantCount) : null,
        validUntil: editDraft.validUntil || null,
        nextReviewAt: editDraft.nextReviewAt || null,
        reviewInterval: editDraft.reviewInterval,
        mandatoryRelevance: editDraft.mandatoryRelevance,
        status: editDraft.status,
        externalLinks: editDraft.externalLinks,
        linkedRiskIds: editDraft.links.linkedRiskIds,
        linkedMeasureIds: editDraft.links.linkedMeasureIds,
        linkedTaskIds: editDraft.links.linkedTaskIds,
        linkedIncidentIds: editDraft.links.linkedIncidentIds,
        linkedVendorIds: editDraft.links.linkedVendorIds,
        linkedAuditAreas: editDraft.links.linkedAuditAreas,
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
    setDetailTab("files");
  }

  async function handleTemplateSelect(templateKey: string) {
    setTemplateLoadingKey(templateKey);
    setError(null);
    const res = await fetch("/api/compliance-evidence/from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, templateKey }),
    });
    const data = await res.json();
    setTemplateLoadingKey(null);
    if (!res.ok) {
      setError(data.error ?? "Vorlage konnte nicht angelegt werden");
      return;
    }
    setTemplatesOpen(false);
    setActiveSection("detail");
    await reload();
    if (data.entry?.id) setSelectedId(data.entry.id);
    setFeedback(`Vorlage „${data.entry?.title ?? ""}" angelegt.`);
  }

  async function handleAuditExport() {
    setExporting(true);
    setError(null);
    const res = await fetch("/api/compliance-evidence/export-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    const data = await res.json();
    setExporting(false);
    if (!res.ok) {
      setError(data.error ?? "Export fehlgeschlagen");
      return;
    }
    const blob = new Blob([data.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.fileName ?? "Schulungen_Nachweise_Audit.md";
    a.click();
    URL.revokeObjectURL(url);
    setFeedback(`Audit-Export erstellt (${data.entryCount ?? 0} Einträge).`);
    setActiveSection("overview");
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

  function resolveLinkLabel(
    ids: string[],
    options: { id: string; label: string }[]
  ): string[] {
    return ids.map((id) => options.find((o) => o.id === id)?.label ?? id);
  }

  const missingEvidenceTone = scope === "mandatory" ? "red" : "slate";

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
          {scope === "mandatory" && <p>{NIS2_MANDATORY_SCOPE_MESSAGE}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {MODULE_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => navigateSection(section.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
              activeSection === section.id ||
              (section.id === "detail" && detailTab === "detail" && selected) ||
              (section.id === "files" && detailTab === "files" && selected)
                ? "bg-brand-600 text-white shadow-sm shadow-brand-500/30"
                : "bg-slate-100 text-slate-700 hover:-translate-y-0.5 hover:bg-slate-200"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {(activeSection === "overview" || activeSection === "export") && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard icon={FileStack} tone="brand" label="Einträge gesamt" value={stats.totalEntries} delay={0} />
          <StatCard icon={CheckCircle2} tone="emerald" label="Vollständig" value={stats.completeEntries} delay={40} />
          <StatCard
            icon={FileWarning}
            tone={missingEvidenceTone}
            label="Fehlende Nachweise"
            value={stats.missingEvidence}
            delay={80}
          />
          <StatCard icon={CalendarClock} tone="amber" label="Reviews fällig" value={stats.reviewsDue} delay={120} />
          <StatCard icon={AlertTriangle} tone="amber" label="Abgelaufen" value={stats.expiredEntries} delay={160} />
          <StatCard
            icon={FileText}
            tone="slate"
            label="Freiwillig dokumentiert"
            value={stats.voluntaryDocumented}
            delay={200}
          />
          <StatCard icon={ShieldCheck} tone="brand" label="Pflichtrelevant" value={stats.mandatoryRelevant} delay={240} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as EvidenceCategory | "all")}
        >
          <option value="all">Alle Kategorien</option>
          {EVIDENCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EVIDENCE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
          <FileStack className="h-4 w-4" />
          Vorlage hinzufügen
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={() => void handleAuditExport()}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Audit exportieren
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className={activeSection === "new" ? "" : "hidden lg:block"}>
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
                  onChange={(e) => setNewMandatory(e.target.value as EvidenceMandatoryRelevance)}
                >
                  {Object.entries(MANDATORY_RELEVANCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as EvidenceEntryStatus)}
                >
                  {EVIDENCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {EVIDENCE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Durchführungsdatum</Label>
                <Input type="date" value={newConductedAt} onChange={(e) => setNewConductedAt(e.target.value)} />
              </div>
              <div>
                <Label>Verantwortlicher</Label>
                <Input value={newResponsible} onChange={(e) => setNewResponsible(e.target.value)} />
              </div>
              <div>
                <Label>Teilnehmer / Zielgruppe</Label>
                <Input value={newParticipantsTarget} onChange={(e) => setNewParticipantsTarget(e.target.value)} />
              </div>
              <div>
                <Label>Abteilung</Label>
                <Input value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} />
              </div>
              <div>
                <Label>Anzahl Teilnehmer</Label>
                <Input
                  type="number"
                  min={0}
                  value={newParticipantCount}
                  onChange={(e) => setNewParticipantCount(e.target.value)}
                />
              </div>
              <div>
                <Label>Gültig bis</Label>
                <Input type="date" value={newValidUntil} onChange={(e) => setNewValidUntil(e.target.value)} />
              </div>
              <div>
                <Label>Reviewintervall</Label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newReviewInterval}
                  onChange={(e) => setNewReviewInterval(e.target.value as ReviewInterval)}
                >
                  {Object.entries(REVIEW_INTERVAL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {newReviewInterval === "custom" && (
                <div>
                  <Label>Nächster Review</Label>
                  <Input type="date" value={newNextReview} onChange={(e) => setNewNextReview(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Beschreibung</Label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <EvidenceLinkFields value={newLinks} options={linkOptions} onChange={setNewLinks} />
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
                    onClick={() => {
                      setSelectedId(entry.id);
                      setActiveSection("detail");
                      setDetailTab("detail");
                    }}
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
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
              {(
                [
                  { id: "detail", label: "Details", icon: GraduationCap },
                  { id: "files", label: "Datei-Upload", icon: Upload },
                  { id: "links", label: "Verknüpfungen", icon: Link2 },
                  { id: "review", label: "Review", icon: Clock },
                  { id: "activity", label: "Aktivität", icon: History },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setDetailTab(tab.id);
                    setActiveSection(tab.id === "detail" ? "detail" : tab.id);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                    detailTab === tab.id ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {detailTab === "detail" && (
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
                      <Button type="button" variant="outline" size="sm" onClick={() => void handleDelete()} disabled={saving}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge className={EVIDENCE_STATUS_BADGE[displayStatus(selected)]}>
                    {EVIDENCE_STATUS_LABELS[displayStatus(selected) as keyof typeof EVIDENCE_STATUS_LABELS]}
                  </Badge>

                  {selected.recommended_file_labels?.length > 0 && (
                    <div className="rounded-lg bg-slate-50 p-3 text-sm">
                      <p className="font-medium text-slate-700">Empfohlene Dateien</p>
                      <ul className="mt-1 list-inside list-disc text-slate-600">
                        {selected.recommended_file_labels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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
                            setEditDraft((d) => ({ ...d, category: e.target.value as EvidenceCategory }))
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
                            setEditDraft((d) => ({ ...d, entryType: e.target.value as EvidenceEntryType }))
                          }
                        >
                          {EVIDENCE_ENTRY_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {EVIDENCE_ENTRY_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={editDraft.status}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, status: e.target.value as EvidenceEntryStatus }))
                          }
                        >
                          {EVIDENCE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {EVIDENCE_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Pflichtrelevant</Label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={editDraft.mandatoryRelevance}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              mandatoryRelevance: e.target.value as EvidenceMandatoryRelevance,
                            }))
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
                        <Label>Teilnehmer / Zielgruppe</Label>
                        <Input
                          value={editDraft.participantsTarget}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, participantsTarget: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Abteilung</Label>
                        <Input
                          value={editDraft.department}
                          onChange={(e) => setEditDraft((d) => ({ ...d, department: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Reviewintervall</Label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={editDraft.reviewInterval}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              reviewInterval: e.target.value as ReviewInterval,
                            }))
                          }
                        >
                          {Object.entries(REVIEW_INTERVAL_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
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
                        <EvidenceLinkFields
                          value={editDraft.links}
                          options={linkOptions}
                          onChange={(links) => setEditDraft((d) => ({ ...d, links }))}
                        />
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
                      {selected.participants_target && <p>Teilnehmer: {selected.participants_target}</p>}
                      {selected.department && <p>Abteilung: {selected.department}</p>}
                      {selected.participant_count != null && (
                        <p>Anzahl Teilnehmer: {selected.participant_count}</p>
                      )}
                      {selected.valid_until && <p>Gültig bis: {formatDate(selected.valid_until)}</p>}
                      {selected.next_review_at && (
                        <p>Nächster Review: {formatDate(selected.next_review_at)}</p>
                      )}
                      {selected.review_interval && selected.review_interval !== "none" && (
                        <p>Reviewintervall: {REVIEW_INTERVAL_LABELS[selected.review_interval]}</p>
                      )}
                      <p>Pflicht: {MANDATORY_RELEVANCE_LABELS[selected.mandatory_relevance]}</p>
                      {selected.external_links?.length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="font-medium">Links</p>
                          <ul className="mt-1 space-y-1">
                            {selected.external_links.map((link, i) => (
                              <li key={`${link.url}-${i}`}>
                                <a href={link.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {detailTab === "files" && (
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
                                {file.file_size ? ` · ${Math.round(file.file_size / 1024)} KB` : ""}
                              </p>
                            </div>
                            {file.file_url && (
                              <a href={file.file_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                                Öffnen
                              </a>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {detailTab === "links" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verknüpfungen</CardTitle>
                  <CardDescription>Risiken, Maßnahmen, Aufgaben, Incidents, Lieferanten, Audit-Bereiche</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {editing ? (
                    <EvidenceLinkFields
                      value={editDraft.links}
                      options={linkOptions}
                      onChange={(links) => setEditDraft((d) => ({ ...d, links }))}
                    />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        { label: "Risiken", ids: selected.linked_risk_ids, opts: linkOptions.risks },
                        { label: "Maßnahmen", ids: selected.linked_measure_ids, opts: linkOptions.measures },
                        { label: "Aufgaben", ids: selected.linked_task_ids, opts: linkOptions.tasks },
                        { label: "Incidents", ids: selected.linked_incident_ids, opts: linkOptions.incidents },
                        { label: "Lieferanten", ids: selected.linked_vendor_ids, opts: linkOptions.vendors },
                        { label: "Audit-Bereiche", ids: selected.linked_audit_areas, opts: linkOptions.auditAreas },
                      ].map((group) =>
                        group.ids.length > 0 ? (
                          <div key={group.label}>
                            <p className="font-medium text-slate-700">{group.label}</p>
                            <ul className="mt-1 list-inside list-disc text-slate-600">
                              {resolveLinkLabel(group.ids, group.opts).map((name) => (
                                <li key={name}>{name}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null
                      )}
                      {![
                        ...selected.linked_risk_ids,
                        ...selected.linked_measure_ids,
                        ...selected.linked_task_ids,
                        ...selected.linked_incident_ids,
                        ...selected.linked_vendor_ids,
                        ...selected.linked_audit_areas,
                      ].length && (
                        <p className="text-slate-500">Keine Verknüpfungen hinterlegt.</p>
                      )}
                    </div>
                  )}
                  {!editing && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                      Verknüpfungen bearbeiten
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {detailTab === "review" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Review & Wiedervorlagen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <p>
                    Reviewintervall:{" "}
                    <strong>{REVIEW_INTERVAL_LABELS[selected.review_interval ?? "none"]}</strong>
                  </p>
                  {selected.next_review_at ? (
                    <p>
                      Nächster Review: <strong>{formatDate(selected.next_review_at)}</strong>
                    </p>
                  ) : (
                    <p>Kein Review-Termin hinterlegt.</p>
                  )}
                  {selected.valid_until && (
                    <p>
                      Gültig bis: <strong>{formatDate(selected.valid_until)}</strong>
                    </p>
                  )}
                  <Badge className={EVIDENCE_STATUS_BADGE[displayStatus(selected)]}>
                    {EVIDENCE_STATUS_LABELS[displayStatus(selected) as keyof typeof EVIDENCE_STATUS_LABELS]}
                  </Badge>
                  {displayStatus(selected) === "review_faellig" && (
                    <p className="text-amber-700">Review ist fällig — bitte Nachweis prüfen und aktualisieren.</p>
                  )}
                  {displayStatus(selected) === "abgelaufen" && (
                    <p className="text-red-700">Nachweis abgelaufen — bitte erneuern.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {detailTab === "activity" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aktivitätsverlauf</CardTitle>
                </CardHeader>
                <CardContent>
                  <EvidenceActivityPanel companyId={companyId} entryId={selected.id} />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Eintrag auswählen, Vorlage hinzufügen oder neu anlegen.
            </CardContent>
          </Card>
        )}
      </div>

      <EvidenceTemplatesModal
        open={templatesOpen}
        scope={scope}
        loadingKey={templateLoadingKey}
        onClose={() => {
          setTemplatesOpen(false);
          if (activeSection === "templates") setActiveSection("overview");
        }}
        onSelect={(key) => void handleTemplateSelect(key)}
      />
    </div>
  );
}
