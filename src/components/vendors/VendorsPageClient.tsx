"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  VendorApplicability,
  VendorCategory,
  VendorDashboardStats,
  VendorEvidence,
  VendorQuestionnaireAnswers,
  VendorStatus,
  VendorWithDetails,
} from "@/lib/types";
import {
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUS_LABELS,
} from "@/lib/vendors/categories";
import {
  getEvidenceLabelForProvider,
  getProviderDefaults,
  getProviderRiskAdvisory,
  getRecommendedEvidenceTypes,
} from "@/lib/vendors/provider-catalog";
import { VendorProviderSelect } from "@/components/vendors/VendorProviderSelect";
import {
  VENDOR_CRITICALITY_LABELS,
  VENDOR_EVIDENCE_LABELS,
  VENDOR_EVIDENCE_STATUS_LABELS,
  VENDOR_EVIDENCE_STATUS_OPTIONS,
  VENDOR_RISK_BADGE,
  VENDOR_RISK_LABELS,
  VENDOR_EVIDENCE_STATUS_BADGE,
} from "@/lib/vendors/evidence-types";
import {
  VENDOR_APPLICABILITY_LABELS,
  VENDOR_APPLICABILITY_QUESTION,
} from "@/lib/vendors/applicability";
import {
  QUESTIONNAIRE_ANSWER_LABELS,
  VENDOR_QUESTIONNAIRE,
} from "@/lib/vendors/questionnaire";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, FileDown, ClipboardCheck, Truck, Trash2, Save, ShieldAlert, FileWarning, CalendarClock } from "lucide-react";

interface VendorsPageClientProps {
  companyId: string;
  companyName: string;
  initialVendors: VendorWithDetails[];
  initialStats: VendorDashboardStats;
  initialApplicability: VendorApplicability;
}

const CRITICALITY_OPTIONS = ["low", "medium", "high", "critical"] as const;

export function VendorsPageClient({
  companyId,
  companyName,
  initialVendors,
  initialStats,
  initialApplicability,
}: VendorsPageClientProps) {
  const router = useRouter();
  const [vendors, setVendors] = useState(initialVendors);
  const [stats, setStats] = useState(initialStats);
  const [applicability, setApplicability] = useState<VendorApplicability>(initialApplicability);
  const [savingApplicability, setSavingApplicability] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialVendors[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newProviderKey, setNewProviderKey] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<VendorCategory>("sonstiger");
  const [newDescription, setNewDescription] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newCriticality, setNewCriticality] = useState<(typeof CRITICALITY_OPTIONS)[number]>("medium");
  const [newStatus, setNewStatus] = useState<VendorStatus>("active");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNextReview, setNewNextReview] = useState("");
  const [providerHints, setProviderHints] = useState<ReturnType<typeof getProviderDefaults>>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: "",
    category: "sonstiger" as VendorCategory,
    description: "",
    website: "",
    criticality: "medium" as (typeof CRITICALITY_OPTIONS)[number],
    status: "active" as VendorStatus,
    contactName: "",
    contactEmail: "",
    nextReviewAt: "",
  });

  const selected = useMemo(
    () => vendors.find((v) => v.id === selectedId) ?? null,
    [vendors, selectedId]
  );

  const [answers, setAnswers] = useState<VendorQuestionnaireAnswers>({});
  const [evidenceDraft, setEvidenceDraft] = useState<VendorEvidence[]>([]);

  const selectedRiskAdvisory = useMemo(
    () => getProviderRiskAdvisory(selected?.provider_key),
    [selected?.provider_key]
  );

  const recommendedEvidenceTypes = useMemo(
    () => getRecommendedEvidenceTypes(selected?.provider_key ?? newProviderKey),
    [selected?.provider_key, newProviderKey]
  );

  const syncSelection = useCallback((vendor: VendorWithDetails | null) => {
    if (!vendor) return;
    setEvidenceDraft(vendor.evidence);
    const latest = vendor.assessments[0];
    const providerDefaults = getProviderDefaults(vendor.provider_key);
    setAnswers(
      latest?.questionnaire_answers ??
        providerDefaults?.questionnaire ??
        {}
    );
    setEditDraft({
      name: vendor.name,
      category: vendor.category ?? "sonstiger",
      description: vendor.description ?? "",
      website: vendor.website ?? "",
      criticality: vendor.criticality,
      status: vendor.status,
      contactName: vendor.contact_name ?? "",
      contactEmail: vendor.contact_email ?? "",
      nextReviewAt: vendor.next_review_at?.slice(0, 10) ?? "",
    });
    setEditing(false);
  }, []);

  useEffect(() => {
    if (selected) syncSelection(selected);
  }, [selected, syncSelection]);

  function selectVendor(id: string) {
    setSelectedId(id);
    const vendor = vendors.find((v) => v.id === id) ?? null;
    syncSelection(vendor);
  }

  async function reload() {
    const res = await fetch(`/api/vendors?companyId=${companyId}`);
    const data = await res.json();
    if (res.ok) {
      setVendors(data.vendors ?? []);
      setStats(data.stats ?? initialStats);
      if (data.applicability) setApplicability(data.applicability);
    }
    router.refresh();
  }

  async function handleApplicabilityChange(value: VendorApplicability) {
    setSavingApplicability(true);
    setError(null);
    setFeedback(null);
    const res = await fetch("/api/vendors/applicability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, applicability: value }),
    });
    const data = await res.json();
    setSavingApplicability(false);
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen");
      return;
    }
    setApplicability(value);
    if (value === "no") {
      setFeedback(
        "Lieferantenbewertung als Nicht zutreffend (N/A) markiert. Kein Score- oder Audit-Abzug."
      );
    } else if (value === "unknown") {
      setFeedback("Hinweis: Unbekannte Relevanz reduziert die Audit-Bereitschaft.");
    } else {
      setFeedback("Lieferantenbewertung ist jetzt verpflichtend. Bitte Lieferanten erfassen.");
    }
    await reload();
  }

  function applyProviderDefaults(providerKey: string | null, name: string) {
    const defaults = getProviderDefaults(providerKey);
    setNewName(name);
    setNewProviderKey(providerKey);
    setProviderHints(defaults);
    if (defaults) {
      setNewCategory(defaults.category);
      setNewWebsite(defaults.website);
      setNewCriticality(defaults.criticality);
      setAnswers((prev) => ({ ...defaults.questionnaire, ...prev }));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        name: newName,
        providerKey: newProviderKey,
        category: newCategory,
        description: newDescription,
        website: newWebsite,
        criticality: newCriticality,
        status: newStatus,
        contactName: newContact,
        contactEmail: newEmail,
        nextReviewAt: newNextReview || undefined,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Anlegen fehlgeschlagen");
      return;
    }
    setNewName("");
    setNewProviderKey(null);
    setNewCategory("sonstiger");
    setNewDescription("");
    setNewWebsite("");
    setNewContact("");
    setNewEmail("");
    setNewNextReview("");
    setProviderHints(null);
    if (data.providerDefaults?.questionnaire) {
      setAnswers(data.providerDefaults.questionnaire);
    }
    await reload();
    if (data.vendor?.id) selectVendor(data.vendor.id);
    setFeedback("Lieferant angelegt.");
  }

  async function handleUpdateVendor() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/vendors/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        name: editDraft.name,
        category: editDraft.category,
        description: editDraft.description,
        website: editDraft.website,
        criticality: editDraft.criticality,
        status: editDraft.status,
        contactName: editDraft.contactName,
        contactEmail: editDraft.contactEmail,
        nextReviewAt: editDraft.nextReviewAt || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen");
      return;
    }
    setEditing(false);
    setFeedback("Stammdaten gespeichert.");
    await reload();
    if (selected.id) selectVendor(selected.id);
  }

  async function handleDeleteVendor() {
    if (!selected) return;
    if (!window.confirm(`Lieferant „${selected.name}“ wirklich entfernen?`)) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/vendors/${selected.id}?companyId=${companyId}`, {
      method: "DELETE",
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Löschen fehlgeschlagen");
      return;
    }
    setSelectedId(null);
    setFeedback("Lieferant entfernt.");
    await reload();
  }

  async function handleSaveEvidence() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/vendors/${selected.id}/evidence`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        evidence: evidenceDraft.map((e) => ({
          id: e.id,
          evidenceType: e.evidence_type,
          status: e.status,
          validUntil: e.valid_until,
          reviewedAt: e.reviewed_at,
          fileName: e.file_name,
          fileUrl: e.file_url,
          notes: e.notes,
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen");
      return;
    }
    setFeedback("Nachweise gespeichert.");
    await reload();
  }

  async function handleAssess() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/vendors/${selected.id}/assessments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        criticality: selected.criticality,
        answers,
        summary: `Bewertung ${companyName} – ${selected.name}`,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Bewertung fehlgeschlagen");
      return;
    }
    setFeedback(`Bewertung v${data.assessment?.version} gespeichert. Score: ${data.result?.vendorScore}%`);
    await reload();
    if (selected.id) selectVendor(selected.id);
  }

  async function handleExportAudit() {
    setExporting(true);
    setError(null);
    const res = await fetch("/api/vendors/export-audit", {
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
    setFeedback(
      `Audit-Dokument „08_Lieferantenbewertung“ erstellt (${data.vendorCount} Lieferanten).`
    );
    router.refresh();
  }

  function updateEvidenceStatus(index: number, status: VendorEvidence["status"]) {
    setEvidenceDraft((prev) =>
      prev.map((row, i) => (i === index ? { ...row, status } : row))
    );
  }

  const vendorsMandatory = applicability === "yes";
  const vendorsNotApplicable = applicability === "no";

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
          <CardTitle className="text-base">Relevanz Lieferanten & Dienstleister</CardTitle>
          <CardDescription>{VENDOR_APPLICABILITY_QUESTION}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(["yes", "no", "unknown"] as VendorApplicability[]).map((value) => (
            <Button
              key={value}
              type="button"
              variant={applicability === value ? "primary" : "outline"}
              disabled={savingApplicability}
              onClick={() => void handleApplicabilityChange(value)}
            >
              {savingApplicability && applicability === value ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {VENDOR_APPLICABILITY_LABELS[value]}
            </Button>
          ))}
        </CardContent>
      </Card>

      {vendorsNotApplicable && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="pt-6 text-sm text-slate-700">
            <p className="font-medium">Status: Nicht zutreffend (N/A)</p>
            <p className="mt-2">
              Für {companyName} ist keine Lieferantenbewertung erforderlich. Der Audit-Bereich
              08_Lieferantenbewertung gilt als bewertet — ohne Score- oder Compliance-Abzug.
            </p>
          </CardContent>
        </Card>
      )}

      {applicability === "unknown" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            Bitte beantworten Sie die Frage oben (Ja/Nein). Solange die Relevanz unbekannt ist,
            wird die Audit-Bereitschaft reduziert.
          </CardContent>
        </Card>
      )}

      {!vendorsNotApplicable && (
        <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Truck} tone="brand" label="Lieferanten" value={stats.totalVendors} delay={0} />
        <StatCard icon={ShieldAlert} tone="amber" label="Kritische Lieferanten" value={stats.criticalVendors} delay={60} />
        <StatCard icon={FileWarning} tone="red" label="Fehlende Nachweise" value={stats.missingEvidenceCount} delay={120} />
        <StatCard icon={CalendarClock} tone="amber" label="Bewertungen fällig" value={stats.reviewsDueCount} delay={180} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleExportAudit}
          disabled={exporting || (vendorsMandatory && vendors.length === 0 && !vendorsNotApplicable)}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Audit-Ordner 08 exportieren
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Lieferanten & Dienstleister anlegen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <VendorProviderSelect
                value={newName}
                providerKey={newProviderKey}
                onChange={(sel) => applyProviderDefaults(sel.providerKey, sel.name)}
              />
              {providerHints && (
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
                  <p className="font-medium">Empfohlene Nachweise</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-brand-800">
                    {providerHints.recommendedEvidence.map((item) => (
                      <li key={`${item.evidenceType}-${item.label}`}>{item.label}</li>
                    ))}
                  </ul>
                  {providerHints.riskAdvisory && (
                    <p className="mt-2 text-xs text-brand-700">{providerHints.riskAdvisory}</p>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="vendor-category">Kategorie</Label>
                <select
                  id="vendor-category"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as VendorCategory)}
                >
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {VENDOR_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="vendor-description">Beschreibung</Label>
                <textarea
                  id="vendor-description"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Leistungsumfang, Vertragsbezug …"
                />
              </div>
              <div>
                <Label htmlFor="vendor-website">Website</Label>
                <Input
                  id="vendor-website"
                  type="url"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div>
                <Label htmlFor="vendor-criticality">Kritikalität</Label>
                <select
                  id="vendor-criticality"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newCriticality}
                  onChange={(e) =>
                    setNewCriticality(e.target.value as (typeof CRITICALITY_OPTIONS)[number])
                  }
                >
                  {CRITICALITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {VENDOR_CRITICALITY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="vendor-status">Status</Label>
                <select
                  id="vendor-status"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as VendorStatus)}
                >
                  <option value="active">{VENDOR_STATUS_LABELS.active}</option>
                  <option value="inactive">{VENDOR_STATUS_LABELS.inactive}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="vendor-next-review">Nächste Prüfung</Label>
                <Input
                  id="vendor-next-review"
                  type="date"
                  value={newNextReview}
                  onChange={(e) => setNewNextReview(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="vendor-contact">Ansprechpartner</Label>
                <Input
                  id="vendor-contact"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="vendor-email">E-Mail</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Lieferant anlegen
              </Button>
            </form>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-slate-700">Bestehende Lieferanten</p>
              {vendors.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine Lieferanten erfasst.</p>
              ) : (
                vendors.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectVendor(v.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedId === v.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{v.name}</span>
                      <Badge className={VENDOR_RISK_BADGE[v.risk_level]}>
                        {VENDOR_RISK_LABELS[v.risk_level]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {VENDOR_CATEGORY_LABELS[v.category ?? "sonstiger"]} · Score {v.vendor_score}% ·{" "}
                      {VENDOR_CRITICALITY_LABELS[v.criticality]}
                    </p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-6">
            {selectedRiskAdvisory && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6 text-sm text-amber-900">
                  <p className="font-medium">Risikohinweis</p>
                  <p className="mt-1">{selectedRiskAdvisory}</p>
                  <p className="mt-2 text-xs">
                    Auch etablierte Anbieter werden nicht automatisch als risikofrei bewertet.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selected.name}</CardTitle>
                    <CardDescription>
                      {VENDOR_CATEGORY_LABELS[selected.category ?? "sonstiger"]} · Letzte Bewertung:{" "}
                      {selected.last_assessed_at ? formatDate(selected.last_assessed_at) : "—"} ·
                      Wiedervorlage:{" "}
                      {selected.next_review_at ? formatDate(selected.next_review_at) : "—"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing((e) => !e)}
                    >
                      {editing ? "Abbrechen" : "Bearbeiten"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDeleteVendor()}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={VENDOR_RISK_BADGE[selected.risk_level]}>
                    Risiko {VENDOR_RISK_LABELS[selected.risk_level]}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-800">Score {selected.vendor_score}%</Badge>
                  <Badge className="bg-slate-100 text-slate-800">
                    Kritikalität {VENDOR_CRITICALITY_LABELS[selected.criticality]}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-800">
                    {VENDOR_STATUS_LABELS[selected.status]}
                  </Badge>
                </div>

                {editing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Firmenname</Label>
                      <Input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
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
                            category: e.target.value as VendorCategory,
                          }))
                        }
                      >
                        {VENDOR_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {VENDOR_CATEGORY_LABELS[c]}
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
                          setEditDraft((d) => ({
                            ...d,
                            status: e.target.value as VendorStatus,
                          }))
                        }
                      >
                        <option value="active">{VENDOR_STATUS_LABELS.active}</option>
                        <option value="inactive">{VENDOR_STATUS_LABELS.inactive}</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Beschreibung</Label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        rows={2}
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, description: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input
                        value={editDraft.website}
                        onChange={(e) => setEditDraft((d) => ({ ...d, website: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Nächste Prüfung</Label>
                      <Input
                        type="date"
                        value={editDraft.nextReviewAt}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, nextReviewAt: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Ansprechpartner</Label>
                      <Input
                        value={editDraft.contactName}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, contactName: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>E-Mail</Label>
                      <Input
                        type="email"
                        value={editDraft.contactEmail}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, contactEmail: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Kritikalität</Label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={editDraft.criticality}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            criticality: e.target.value as (typeof CRITICALITY_OPTIONS)[number],
                          }))
                        }
                      >
                        {CRITICALITY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {VENDOR_CRITICALITY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Button onClick={() => void handleUpdateVendor()} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Stammdaten speichern
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    {selected.description && <p className="sm:col-span-2">{selected.description}</p>}
                    {selected.website && (
                      <p>
                        Website:{" "}
                        <a
                          href={selected.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 hover:underline"
                        >
                          {selected.website}
                        </a>
                      </p>
                    )}
                    {selected.contact_name && <p>Ansprechpartner: {selected.contact_name}</p>}
                    {selected.contact_email && <p>E-Mail: {selected.contact_email}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {recommendedEvidenceTypes.length > 0 && (
              <Card className="border-brand-200 bg-brand-50/50">
                <CardHeader>
                  <CardTitle className="text-base">Empfohlene Nachweise</CardTitle>
                  <CardDescription>
                    Provider-spezifische Vorschläge für {selected.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                    {getProviderDefaults(selected.provider_key)?.recommendedEvidence.map((item) => (
                      <li key={`${item.evidenceType}-${item.label}`}>{item.label}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nachweise & Dokumente</CardTitle>
                <CardDescription>Status je Nachweistyp für Audit und Datenqualität</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(evidenceDraft.length > 0 ? evidenceDraft : selected.evidence).map((row, index) => (
                  <div
                    key={row.id ?? row.evidence_type}
                    className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_160px]"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {getEvidenceLabelForProvider(selected.provider_key, row.evidence_type) ??
                          VENDOR_EVIDENCE_LABELS[row.evidence_type]}
                        {recommendedEvidenceTypes.includes(row.evidence_type) && (
                          <span className="ml-2 text-xs font-normal text-brand-600">
                            empfohlen
                          </span>
                        )}
                      </p>
                      <Badge className={`mt-1 ${VENDOR_EVIDENCE_STATUS_BADGE[row.status]}`}>
                        {VENDOR_EVIDENCE_STATUS_LABELS[row.status]}
                      </Badge>
                    </div>
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={row.status}
                      onChange={(e) =>
                        updateEvidenceStatus(
                          index,
                          e.target.value as VendorEvidence["status"]
                        )
                      }
                    >
                      {VENDOR_EVIDENCE_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {VENDOR_EVIDENCE_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <Button onClick={handleSaveEvidence} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Nachweise speichern
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4" />
                  Lieferantenfragebogen
                </CardTitle>
                <CardDescription>
                  Automatische Bewertung und versionierte Historie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {VENDOR_QUESTIONNAIRE.map((q) => (
                  <div key={q.key}>
                    <Label>{q.label}</Label>
                    {q.help ? <p className="text-xs text-slate-500">{q.help}</p> : null}
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={answers[q.key] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.key]: e.target.value as VendorQuestionnaireAnswers[typeof q.key],
                        }))
                      }
                    >
                      <option value="">— Bitte wählen —</option>
                      <option value="yes">{QUESTIONNAIRE_ANSWER_LABELS.yes}</option>
                      <option value="no">{QUESTIONNAIRE_ANSWER_LABELS.no}</option>
                      <option value="unknown">{QUESTIONNAIRE_ANSWER_LABELS.unknown}</option>
                    </select>
                  </div>
                ))}
                <Button onClick={handleAssess} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Bewertung speichern (versioniert)
                </Button>
              </CardContent>
            </Card>

            {selected.assessments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bewertungshistorie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selected.assessments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">
                        Version {a.version} · {formatDate(a.assessed_at)}
                      </p>
                      <p className="text-slate-600">
                        Score {a.vendor_score}% · Risiko {VENDOR_RISK_LABELS[a.risk_level]} ·
                        Fragebogen {a.questionnaire_score}% · Nachweise {a.evidence_score}%
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Lieferant auswählen oder neu anlegen.
            </CardContent>
          </Card>
        )}
      </div>
        </>
      )}
    </div>
  );
}
