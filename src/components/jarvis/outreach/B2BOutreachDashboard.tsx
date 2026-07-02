"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  B2B_OUTREACH_STATUS_LABELS,
  IT_MATURITY_LABELS,
  NIS2_LIKELIHOOD_LABELS,
  OUTREACH_DAILY_SEND_LIMIT,
  PARTNER_PRIORITY_SCORE,
  PARTNER_QUALIFIED_SCORE,
  PARTNER_REVIEW_SCORE,
} from "@/lib/jarvis/outreach/constants";
import { PARTNER_CATEGORY_LABELS } from "@/lib/jarvis/outreach/partner-categories";
import { OUTREACH_DAY_TIMEZONE } from "@/lib/jarvis/outreach/day-boundary";
import { confidenceBadgeClass } from "@/lib/jarvis/outreach/nis2-relevance-score";
import { splitAnalysisBullets } from "@/lib/jarvis/outreach/assessment-quality";
import {
  DETECTED_WEBSITE_TYPE_LABELS,
  WEB_PRESENCE_STATUS_LABELS,
  webPresenceBadgeClass,
} from "@/lib/jarvis/outreach/web-presence-types";
import type { OutreachQuotaInfo } from "@/lib/jarvis/outreach/processor";
import type { B2BOutreachLead, B2BOutreachStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CustomerMessageSection } from "@/components/jarvis/customer-message/CustomerMessageSection";
import { buildMailtoUrl } from "@/lib/jarvis/customer-message/channels";
import { customerMessageTargetFromB2BLead } from "@/lib/jarvis/customer-message/targets";

interface B2BOutreachDashboardProps {
  leads: B2BOutreachLead[];
  quota: OutreachQuotaInfo;
}

export function B2BOutreachDashboard({ leads: initialLeads, quota }: B2BOutreachDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [filter, setFilter] = useState<B2BOutreachStatus | "all">("all");
  const [scoreFilter, setScoreFilter] = useState<"all" | "top" | "qualified" | "review">("all");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    industry: "",
    website: "",
    employee_count: "",
    contact_name: "",
    contact_role: "",
    contact_email: "",
    hints: "",
  });
  const [csvText, setCsvText] = useState(
    "Firma,Branche,Website,Mitarbeiter,Ansprechpartner,Rolle,E-Mail,Hinweise\n"
  );

  const getPartnerScore = (lead: B2BOutreachLead) =>
    lead.partner_score ?? (lead.nis2_relevance_score != null ? lead.nis2_relevance_score * 10 : null);

  const leads = initialLeads
    .filter((l) => filter === "all" || l.status === filter)
    .filter((l) => {
      if (scoreFilter === "all") return true;
      const score = getPartnerScore(l);
      if (score == null) return scoreFilter === "qualified";
      if (scoreFilter === "top") return score >= PARTNER_PRIORITY_SCORE;
      if (scoreFilter === "qualified") return score >= PARTNER_QUALIFIED_SCORE;
      if (scoreFilter === "review") return score < PARTNER_QUALIFIED_SCORE || l.deprioritized;
      return true;
    })
    .sort((a, b) => {
      const scoreA = getPartnerScore(a) ?? 0;
      const scoreB = getPartnerScore(b) ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const scoreSummary = {
    top: initialLeads.filter((l) => (getPartnerScore(l) ?? 0) >= PARTNER_PRIORITY_SCORE).length,
    qualified: initialLeads.filter((l) => {
      const s = getPartnerScore(l) ?? 0;
      return s >= PARTNER_QUALIFIED_SCORE && s < PARTNER_PRIORITY_SCORE;
    }).length,
    review: initialLeads.filter(
      (l) =>
        l.deprioritized ||
        l.status === "review_later" ||
        ((getPartnerScore(l) ?? 0) >= PARTNER_REVIEW_SCORE &&
          (getPartnerScore(l) ?? 0) < PARTNER_QUALIFIED_SCORE)
    ).length,
    hidden: initialLeads.filter(
      (l) => (getPartnerScore(l) ?? 0) < PARTNER_REVIEW_SCORE && !l.deprioritized
    ).length,
    unscored: initialLeads.filter((l) => getPartnerScore(l) == null).length,
  };

  async function apiCall(url: string, method = "POST", body?: unknown) {
    setError(null);
    setLoading(url);
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
      setLoading(null);
    }
  }

  async function copyMessage(lead: B2BOutreachLead) {
    if (!lead.outreach_message) return;
    await navigator.clipboard.writeText(lead.outreach_message);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function updateStatus(id: string, status: B2BOutreachStatus) {
    await apiCall(`/api/jarvis/outreach/leads/${id}`, "PATCH", { status });
  }

  function openMailto(lead: B2BOutreachLead) {
    if (!lead.contact_email || !lead.outreach_message) return;
    window.location.href = buildMailtoUrl(
      lead.contact_email,
      `TKND NIS2 — ${lead.company_name}`,
      lead.outreach_message
    );
  }

  const contactProgress = Math.min(100, (quota.sentToday / quota.sendLimit) * 100);

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
            <span>
              Heute kontaktiert:{" "}
              <strong>
                {quota.sentToday} / {quota.sendLimit}
              </strong>
            </span>
            <span>
              Noch möglich: <strong>{quota.sendRemaining}</strong>
            </span>
            <span>
              Analysiert: <strong>unbegrenzt</strong>
            </span>
          </div>
          <div className="max-w-md space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Kontakt-Fortschritt (manuell markiert)</span>
              <span>{Math.round(contactProgress)}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuenow={quota.sentToday}
              aria-valuemin={0}
              aria-valuemax={quota.sendLimit}
              aria-label="Kontakt-Fortschritt heute"
            >
              <div
                className={`h-full rounded-full transition-all ${
                  quota.sendLimitReached ? "bg-amber-500" : "bg-sky-600"
                }`}
                style={{ width: `${contactProgress}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Tages-Reset um 00:00 ({OUTREACH_DAY_TIMEZONE})
          </p>
        </CardContent>
      </Card>

      <Card className="border-brand-200 bg-brand-50/40">
        <CardContent className="pt-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Partner-Fokus (intern)</p>
          <p className="mt-1">
            Jarvis priorisiert IT-Dienstleister, MSP und Berater — keine Krankenhäuser, Behörden
            oder langsame Großorganisationen. Ausschluss-Leads landen unter „Später prüfen“.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          <span>
            Partner-Score:{" "}
            <strong className="text-red-700">{scoreSummary.top}</strong> Top (80+) ·{" "}
            <strong className="text-amber-700">{scoreSummary.qualified}</strong> gut (60–79) ·{" "}
            <strong className="text-slate-600">{scoreSummary.review}</strong> prüfen/später ·{" "}
            {scoreSummary.hidden} niedrig
            {scoreSummary.unscored > 0 ? ` · ${scoreSummary.unscored} ohne Score` : ""}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Angezeigt: <strong>{leads.length}</strong> von {initialLeads.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!!loading}
            onClick={() =>
              apiCall("/api/jarvis/outreach/leads/discover-germany", "POST", { limit: 15 })
            }
          >
            <MapPin className="h-4 w-4" />
            DE Top-Leads (15)
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!loading}
            onClick={() =>
              apiCall("/api/jarvis/outreach/leads/discover-dresden", "POST", { limit: 10 })
            }
          >
            Dresden (10)
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!loading}
            onClick={() => apiCall("/api/jarvis/outreach/leads/discover", "POST", { count: 5 })}
          >
            <Search className="h-4 w-4" />
            Demo-Pool
          </Button>
          <Button
            size="sm"
            disabled={!!loading}
            onClick={() => apiCall("/api/jarvis/outreach/leads/process", "POST")}
          >
            <Play className="h-4 w-4" />
            Batch analysieren
          </Button>
          <a
            href="/api/jarvis/outreach/leads/export"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            CSV Export
          </a>
          <Button size="sm" variant="outline" onClick={() => setShowCsv((v) => !v)}>
            <Upload className="h-4 w-4" />
            CSV Import
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Lead manuell
          </Button>
        </div>
      </div>

      {quota.sendLimitReached && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tageslimit erreicht — heute wurden bereits {quota.sendLimit} Leads als kontaktiert
          markiert (kein E-Mail-Versand). Analysen sind weiterhin möglich.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "new", "ready", "contacted", "replied", "customer", "skipped"] as const).map(
          (s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === s
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "Alle" : B2B_OUTREACH_STATUS_LABELS[s]}
              {s !== "all" && (
                <span className="ml-1 opacity-70">
                  ({initialLeads.filter((l) => l.status === s).length})
                </span>
              )}
            </button>
          )
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium text-slate-500">Partner-Score:</span>
        {(["all", "top", "qualified", "review"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScoreFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              scoreFilter === s
                ? "bg-red-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "top"
              ? "Top (80+)"
              : s === "qualified"
                ? "Gut (60+)"
                : s === "review"
                  ? "Prüfen / später"
                  : "Alle Scores"}
          </button>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Lead manuell anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await apiCall("/api/jarvis/outreach/leads", "POST", form);
                setShowForm(false);
                setForm({
                  company_name: "",
                  industry: "",
                  website: "",
                  employee_count: "",
                  contact_name: "",
                  contact_role: "",
                  contact_email: "",
                  hints: "",
                });
              }}
            >
              {(
                [
                  ["company_name", "Firmenname *"],
                  ["industry", "Branche"],
                  ["website", "Website"],
                  ["employee_count", "Mitarbeiter"],
                  ["contact_name", "Ansprechpartner"],
                  ["contact_role", "Rolle"],
                  ["contact_email", "E-Mail"],
                  ["hints", "Hinweise (optional)"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className={
                    key === "company_name" || key === "hints" ? "sm:col-span-2" : ""
                  }
                >
                  <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={key === "company_name"}
                  />
                </div>
              ))}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={!!loading}>
                  Speichern
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showCsv && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <Button
              disabled={!!loading}
              onClick={async () => {
                await apiCall("/api/jarvis/outreach/leads/import", "POST", { csv: csvText });
                setShowCsv(false);
              }}
            >
              Importieren
            </Button>
          </CardContent>
        </Card>
      )}

      {leads.length === 0 ? (
        <p className="text-sm text-slate-500">
          {initialLeads.length === 0
            ? "Keine Leads in der Pipeline. „DE Top-Leads“ oder manuell anlegen — dann „Batch analysieren“."
            : `Keine Leads für den aktuellen Filter (${initialLeads.length} insgesamt). Score-Filter auf „Alle Scores“ stellen oder Status-Filter prüfen.`}
        </p>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => {
            const partnerScore = getPartnerScore(lead);
            const isTopLead = (partnerScore ?? 0) >= PARTNER_PRIORITY_SCORE;
            const categoryLabel =
              lead.lead_category &&
              PARTNER_CATEGORY_LABELS[lead.lead_category as keyof typeof PARTNER_CATEGORY_LABELS]
                ? PARTNER_CATEGORY_LABELS[lead.lead_category as keyof typeof PARTNER_CATEGORY_LABELS]
                : lead.lead_category;
            const bullets = Array.isArray(lead.analysis_bullets) ? lead.analysis_bullets : [];
            const { assessment, webPresence, scoring } = splitAnalysisBullets(bullets);
            const stammdatenLine = scoring.find((l) => l.includes("Stammdaten:"));
            const stammdatenMatch = stammdatenLine?.match(/Stammdaten:\s*(\d+)%/);
            const stammdatenConfidence = stammdatenMatch ? Number(stammdatenMatch[1]) : null;
            return (
            <Card
              key={lead.id}
              className={isTopLead ? "border-red-200 ring-1 ring-red-100" : undefined}
            >
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{lead.company_name}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {lead.city ? `${lead.city} · ` : ""}
                    {lead.industry ?? "—"}
                    {lead.employee_count ? ` · ${lead.employee_count} MA` : ""}
                    {lead.contact_role ? ` · ${lead.contact_role}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    E-Mail:{" "}
                    {lead.contact_email ? (
                      <span className="font-medium text-slate-700">{lead.contact_email}</span>
                    ) : lead.processed_at ? (
                      <span className="text-amber-700">nicht gefunden — manuell eintragen</span>
                    ) : (
                      <span className="text-slate-400">wird bei Analyse von Website gesucht</span>
                    )}
                  </p>
                  {lead.observation && (
                    <p className="mt-2 text-sm text-slate-700">{lead.observation}</p>
                  )}
                  {lead.outreach_hook && (
                    <p className="mt-1 rounded-lg bg-sky-50 px-3 py-2 text-sm italic text-sky-900">
                      Hook: {lead.outreach_hook}
                    </p>
                  )}
                  {lead.recommended_pitch && (
                    <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
                      Pitch: {lead.recommended_pitch}
                    </p>
                  )}
                  {lead.recommended_next_step && (
                    <p className="mt-1 text-xs text-slate-500">
                      Nächster Schritt: {lead.recommended_next_step}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {partnerScore != null && (
                    <Badge
                      className={
                        partnerScore >= PARTNER_PRIORITY_SCORE
                          ? "bg-red-100 text-red-800"
                          : partnerScore >= PARTNER_QUALIFIED_SCORE
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                      }
                    >
                      Partner {partnerScore}/100
                    </Badge>
                  )}
                  {categoryLabel && (
                    <Badge className="bg-brand-100 text-brand-800">{categoryLabel}</Badge>
                  )}
                  {lead.deprioritized && (
                    <Badge className="bg-slate-200 text-slate-700">Später prüfen</Badge>
                  )}
                  {lead.web_presence_status && (
                    <Badge className={webPresenceBadgeClass(lead.web_presence_status)}>
                      {WEB_PRESENCE_STATUS_LABELS[lead.web_presence_status]}
                      {lead.web_presence_confidence != null
                        ? ` · ${lead.web_presence_confidence}%`
                        : ""}
                    </Badge>
                  )}
                  {stammdatenConfidence != null && (
                    <Badge className={confidenceBadgeClass(stammdatenConfidence)}>
                      Stammdaten {stammdatenConfidence}%
                    </Badge>
                  )}
                  {lead.detected_website_type &&
                    lead.detected_website_type !== "none" &&
                    lead.detected_website_type !== "unclear" && (
                    <Badge className="bg-indigo-50 text-indigo-800">
                      {DETECTED_WEBSITE_TYPE_LABELS[lead.detected_website_type]}
                    </Badge>
                  )}
                  <Badge className="bg-slate-100 text-slate-700">
                    {lead.status === "ready" && lead.processed_at
                      ? "Analysiert · Bereit"
                      : B2B_OUTREACH_STATUS_LABELS[lead.status] ?? lead.status}
                  </Badge>
                  {lead.nis2_likelihood !== "uncertain" && (
                    <Badge
                      className={
                        lead.nis2_likelihood === "yes"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      NIS2: {NIS2_LIKELIHOOD_LABELS[lead.nis2_likelihood]}
                    </Badge>
                  )}
                  <Badge className="bg-sky-50 text-sky-800">
                    IT: {IT_MATURITY_LABELS[lead.it_maturity]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessment.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Bewertungsqualität
                    </p>
                    <ul className="list-inside list-disc text-sm text-slate-600">
                      {assessment.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(webPresence.length > 0 ||
                  lead.web_presence_note ||
                  (lead.web_presence_evidence?.length ?? 0) > 0) && (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Web-Präsenz
                    </p>
                    {webPresence.length > 0 && (
                      <ul className="mb-2 list-inside list-disc text-sm text-slate-600">
                        {webPresence.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {lead.web_presence_note && !webPresence.some((b) => b.includes(lead.web_presence_note!)) && (
                      <p className="mb-2 text-sm text-slate-700">{lead.web_presence_note}</p>
                    )}
                    {lead.detected_website_url && (
                      <p className="mb-2 text-xs text-slate-500">
                        Erkannte URL:{" "}
                        <a
                          href={lead.detected_website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-700 underline"
                        >
                          {lead.detected_website_url}
                        </a>
                      </p>
                    )}
                    {(lead.web_presence_evidence?.length ?? 0) > 0 && (
                      <ul className="space-y-2 text-xs text-slate-600">
                        {lead.web_presence_evidence!.map((ev, i) => (
                          <li key={`${ev.source}-${i}`} className="rounded border border-white/80 bg-white/60 p-2">
                            <span className="font-medium text-slate-700">{ev.source}</span>
                            {" — "}
                            {ev.reason}
                            {ev.url ? (
                              <>
                                {" "}
                                <span className="text-slate-400">({ev.url})</span>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {scoring.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      NIS2-Relevanz (Stammdaten)
                    </p>
                    <ul className="list-inside list-disc text-sm text-slate-600">
                      {scoring.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {lead.outreach_message ? (
                  <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                    {lead.outreach_message}
                  </pre>
                ) : lead.processed_at ? (
                  <p className="text-sm text-slate-400 italic">
                    Keine Nachricht (Score &lt; 6 — niedrige Priorität).
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Noch nicht analysiert.</p>
                )}

                <CustomerMessageSection
                  target={customerMessageTargetFromB2BLead(lead)}
                  compact
                />

                <div className="flex flex-wrap gap-2">
                  {lead.status === "new" && (
                    <Button
                      size="sm"
                      disabled={!!loading}
                      onClick={() => apiCall(`/api/jarvis/outreach/leads/${lead.id}`, "POST")}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Analysieren
                    </Button>
                  )}
                  {lead.outreach_message && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copyMessage(lead)}>
                        {copiedId === lead.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        Nachricht kopieren
                      </Button>
                      {lead.contact_email && (
                        <Button size="sm" variant="outline" onClick={() => openMailto(lead)}>
                          <ExternalLink className="h-4 w-4" />
                          Mailprogramm öffnen
                        </Button>
                      )}
                    </>
                  )}
                  {lead.status === "ready" && (
                    <Button
                      size="sm"
                      disabled={quota.sendLimitReached}
                      onClick={() => updateStatus(lead.id, "contacted")}
                    >
                      Als kontaktiert markieren
                    </Button>
                  )}
                  {lead.status === "contacted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(lead.id, "replied")}
                    >
                      Antwort erhalten
                    </Button>
                  )}
                  {lead.status === "replied" && (
                    <Button size="sm" onClick={() => updateStatus(lead.id, "customer")}>
                      Kunde
                    </Button>
                  )}
                  {!["skipped", "customer"].includes(lead.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateStatus(lead.id, "skipped")}
                    >
                      Überspringen
                    </Button>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Quelle: {lead.source} · Erstellt: {formatDate(lead.created_at)}
                  {lead.processed_at ? ` · Analysiert: ${formatDate(lead.processed_at)}` : ""}
                </p>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Kein E-Mail-Auto-Versand. Kontakt-Limit: {OUTREACH_DAILY_SEND_LIMIT} Markierungen/Tag
        (manuell). Analysen unbegrenzt. OpenAI optional für bessere Texte.
      </p>
    </div>
  );
}
