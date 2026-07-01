"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  VendorDashboardStats,
  VendorEvidence,
  VendorQuestionnaireAnswers,
  VendorWithDetails,
} from "@/lib/types";
import {
  VENDOR_CRITICALITY_LABELS,
  VENDOR_EVIDENCE_LABELS,
  VENDOR_EVIDENCE_STATUS_LABELS,
  VENDOR_RISK_BADGE,
  VENDOR_RISK_LABELS,
  VENDOR_EVIDENCE_STATUS_BADGE,
} from "@/lib/vendors/evidence-types";
import {
  QUESTIONNAIRE_ANSWER_LABELS,
  VENDOR_QUESTIONNAIRE,
} from "@/lib/vendors/questionnaire";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, FileDown, ClipboardCheck, Truck } from "lucide-react";

interface VendorsPageClientProps {
  companyId: string;
  companyName: string;
  initialVendors: VendorWithDetails[];
  initialStats: VendorDashboardStats;
}

const CRITICALITY_OPTIONS = ["low", "medium", "high", "critical"] as const;
const EVIDENCE_STATUS_OPTIONS = ["present", "missing", "expired", "review_due"] as const;

export function VendorsPageClient({
  companyId,
  companyName,
  initialVendors,
  initialStats,
}: VendorsPageClientProps) {
  const router = useRouter();
  const [vendors, setVendors] = useState(initialVendors);
  const [stats, setStats] = useState(initialStats);
  const [selectedId, setSelectedId] = useState<string | null>(initialVendors[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCriticality, setNewCriticality] = useState<(typeof CRITICALITY_OPTIONS)[number]>("medium");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const selected = useMemo(
    () => vendors.find((v) => v.id === selectedId) ?? null,
    [vendors, selectedId]
  );

  const [answers, setAnswers] = useState<VendorQuestionnaireAnswers>({});
  const [evidenceDraft, setEvidenceDraft] = useState<VendorEvidence[]>([]);

  const syncSelection = useCallback((vendor: VendorWithDetails | null) => {
    if (!vendor) return;
    setEvidenceDraft(vendor.evidence);
    const latest = vendor.assessments[0];
    setAnswers(latest?.questionnaire_answers ?? {});
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
    }
    router.refresh();
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
        criticality: newCriticality,
        contactName: newContact,
        contactEmail: newEmail,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Anlegen fehlgeschlagen");
      return;
    }
    setNewName("");
    setNewContact("");
    setNewEmail("");
    await reload();
    if (data.vendor?.id) selectVendor(data.vendor.id);
    setFeedback("Lieferant angelegt.");
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Lieferanten</p>
            <p className="text-2xl font-bold">{stats.totalVendors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Kritische Lieferanten</p>
            <p className="text-2xl font-bold text-orange-700">{stats.criticalVendors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Fehlende Nachweise</p>
            <p className="text-2xl font-bold text-red-700">{stats.missingEvidenceCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Bewertungen fällig</p>
            <p className="text-2xl font-bold text-amber-700">{stats.reviewsDueCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleExportAudit} disabled={exporting || vendors.length === 0}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Audit-Ordner 08 exportieren
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Lieferanten anlegen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label htmlFor="vendor-name">Name</Label>
                <Input
                  id="vendor-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="z. B. Cloud-Provider GmbH"
                  required
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
                      Score {v.vendor_score}% · {VENDOR_CRITICALITY_LABELS[v.criticality]}
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
                <CardTitle>{selected.name}</CardTitle>
                <CardDescription>
                  Letzte Bewertung:{" "}
                  {selected.last_assessed_at ? formatDate(selected.last_assessed_at) : "—"} ·
                  Wiedervorlage:{" "}
                  {selected.next_review_at ? formatDate(selected.next_review_at) : "—"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge className={VENDOR_RISK_BADGE[selected.risk_level]}>
                  Risiko {VENDOR_RISK_LABELS[selected.risk_level]}
                </Badge>
                <Badge className="bg-slate-100 text-slate-800">Score {selected.vendor_score}%</Badge>
                <Badge className="bg-slate-100 text-slate-800">
                  Kritikalität {VENDOR_CRITICALITY_LABELS[selected.criticality]}
                </Badge>
              </CardContent>
            </Card>

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
                        {VENDOR_EVIDENCE_LABELS[row.evidence_type]}
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
                      {EVIDENCE_STATUS_OPTIONS.map((s) => (
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
    </div>
  );
}
