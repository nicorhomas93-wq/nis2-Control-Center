"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Megaphone, Plus, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  CampaignLeadCard,
  DemoRow,
  ResponseRow,
} from "@/components/jarvis/kampagnen/CampaignLeadCard";
import {
  ACTIVE_CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  ENDED_CAMPAIGN_STATUSES,
  LEAD_STATUS_LABELS,
  LOST_LEAD_STATUSES,
  WON_LEAD_STATUSES,
} from "@/lib/jarvis/kampagnen/constants";
import { computeReminders, getTodayReminders } from "@/lib/jarvis/kampagnen/reminders";
import { computeKampagnenStats, summarizeNextSteps } from "@/lib/jarvis/kampagnen/stats";
import { CAMPAIGN_IDEAS, CAMPAIGN_TEMPLATES } from "@/lib/jarvis/kampagnen/templates";
import { computeTodayImportant } from "@/lib/jarvis/kampagnen/today-important";
import { ResponseCaptureForm } from "@/components/jarvis/kampagnen/ResponseCaptureForm";
import type {
  LinkedInCampaign,
  LinkedInCampaignDemo,
  LinkedInCampaignLead,
  LinkedInCampaignResponse,
  LinkedInCampaignTask,
} from "@/lib/types";

interface KampagnenDashboardProps {
  campaigns: LinkedInCampaign[];
  leads: LinkedInCampaignLead[];
  responses: LinkedInCampaignResponse[];
  demos: LinkedInCampaignDemo[];
  tasks: LinkedInCampaignTask[];
}

export function KampagnenDashboard({
  campaigns,
  leads,
  responses,
  demos,
  tasks,
}: KampagnenDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "overview";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [responseLead, setResponseLead] = useState<LinkedInCampaignLead | null>(null);
  const [demoLead, setDemoLead] = useState<LinkedInCampaignLead | null>(null);

  const stats = computeKampagnenStats(campaigns, leads, responses, demos);
  const todayImportant = computeTodayImportant(leads, responses, tasks);
  const reminders = getTodayReminders(computeReminders(leads, demos));
  const nextSteps = summarizeNextSteps(leads);

  const activeCampaigns = campaigns.filter((c) =>
    ACTIVE_CAMPAIGN_STATUSES.includes(c.status as never)
  );
  const endedCampaigns = campaigns.filter((c) =>
    ENDED_CAMPAIGN_STATUSES.includes(c.status as never)
  );
  const wonLeads = leads.filter((l) => WON_LEAD_STATUSES.includes(l.status as never));
  const lostLeads = leads.filter((l) => LOST_LEAD_STATUSES.includes(l.status as never));

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

  async function approveCampaign(campaignId: string) {
    if (!confirm("Gesamte Kampagne freigeben?")) return;
    await apiCall(`/api/jarvis/kampagnen/${campaignId}/approve`, "POST");
  }

  async function startTemplate(templateKey: string) {
    await apiCall("/api/jarvis/kampagnen/start", "POST", { template_key: templateKey });
  }

  async function updateLead(leadId: string, body: Record<string, unknown>) {
    await apiCall(`/api/jarvis/kampagnen/leads/${leadId}`, "PATCH", body);
  }

  async function submitResponse(payload: Record<string, unknown>) {
    await apiCall("/api/jarvis/kampagnen/responses", "POST", payload);
    setResponseLead(null);
  }

  const [form, setForm] = useState({
    name: "",
    target_group: "",
    description: "",
    responsible: "Nico",
    goal: "",
  });
  const [demoForm, setDemoForm] = useState({
    scheduled_at: "",
    contact_name: "",
    notes: "",
  });

  async function submitDemo() {
    if (!demoLead) return;
    await apiCall("/api/jarvis/kampagnen/demos", "POST", {
      campaign_id: demoLead.campaign_id,
      lead_id: demoLead.id,
      company_name: demoLead.company_name,
      contact_name: demoForm.contact_name || demoLead.contact_name,
      scheduled_at: demoForm.scheduled_at || null,
      notes: demoForm.notes,
    });
    setDemoLead(null);
    setDemoForm({ scheduled_at: "", contact_name: "", notes: "" });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Aktive Kampagnen", value: stats.activeCampaigns },
          { label: "Leads gesamt", value: stats.totalLeads },
          { label: "Kontaktiert", value: stats.contacted },
          { label: "Antworten", value: stats.responses },
          { label: "Demos", value: stats.demos },
          { label: "Angebote", value: stats.quotes },
          { label: "Gewonnen", value: stats.won },
          {
            label: "Pipelinewert",
            value: `${stats.pipelineValue.toLocaleString("de-DE")} €`,
          },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200">
            <CardContent className="pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {s.label}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {todayImportant.items.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader>
            <CardTitle className="text-base text-violet-900">Heute wichtig</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {todayImportant.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{item.count}</strong> {item.label}
                </span>
                <span className="text-xs text-slate-500">{item.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {reminders.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">Heute fällig</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{r.company_name}</strong> — {r.label}: {r.detail}
                </span>
                {r.lead_id && (
                  <span className="text-xs text-slate-500">
                    {LEAD_STATUS_LABELS.contacted}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={loading} onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Kampagne anlegen
        </Button>
        {CAMPAIGN_TEMPLATES.slice(0, 4).map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => startTemplate(t.key)}
          >
            <Rocket className="h-4 w-4" />
            {t.name}
          </Button>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Neue Kampagne</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await apiCall("/api/jarvis/kampagnen", "POST", { ...form, status: "draft" });
                setShowForm(false);
                setForm({ name: "", target_group: "", description: "", responsible: "Nico", goal: "" });
              }}
            >
              {(
                [
                  ["name", "Kampagnenname *"],
                  ["target_group", "Zielgruppe *"],
                  ["responsible", "Verantwortlicher"],
                  ["goal", "Ziel"],
                  ["description", "Beschreibung"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={key === "description" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={key === "name" || key === "target_group"}
                  />
                </div>
              ))}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading}>
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(view === "overview" || !view) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kampagnen-Vorlagen (1 Klick starten)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {CAMPAIGN_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  disabled={loading}
                  onClick={() => startTemplate(t.key)}
                  className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-left text-sm hover:bg-violet-50"
                >
                  <p className="font-medium text-slate-900">{t.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{t.target_group}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jarvis — Nächste Schritte</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">Noch offen ({nextSteps.openLeads.length})</p>
                <ul className="mt-1 list-inside list-disc text-slate-600">
                  {nextSteps.openLeads.slice(0, 5).map((l) => (
                    <li key={l.id}>{l.company_name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-900">Antworten ({nextSteps.repliedLeads.length})</p>
                <ul className="mt-1 list-inside list-disc text-slate-600">
                  {nextSteps.repliedLeads.slice(0, 5).map((l) => (
                    <li key={l.id}>{l.company_name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-900">Demo / Preis ({nextSteps.demoLeads.length + nextSteps.pricingLeads.length})</p>
                <ul className="mt-1 list-inside list-disc text-slate-600">
                  {[...nextSteps.demoLeads, ...nextSteps.pricingLeads].slice(0, 5).map((l) => (
                    <li key={l.id}>{l.company_name}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kampagnen-Ideen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {CAMPAIGN_IDEAS.map((idea) => (
                <div key={idea.name} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">{idea.name}</p>
                  <p className="text-xs text-slate-500">{idea.target_group}</p>
                  <p className="mt-1 text-slate-600">Ziel: {idea.goal}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {activeCampaigns.slice(0, 4).map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                leadCount={leads.filter((l) => l.campaign_id === c.id).length}
                onApprove={approveCampaign}
                loading={loading}
              />
            ))}
          </div>
        </>
      )}

      {view === "aktiv" && (
        <div className="grid gap-4 md:grid-cols-2">
          {activeCampaigns.length === 0 ? (
            <p className="text-sm text-slate-500">Keine aktiven Kampagnen — Vorlage starten oder anlegen.</p>
          ) : (
            activeCampaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                leadCount={leads.filter((l) => l.campaign_id === c.id).length}
                onApprove={approveCampaign}
                loading={loading}
              />
            ))
          )}
        </div>
      )}

      {view === "abgeschlossen" && (
        <div className="grid gap-4 md:grid-cols-2">
          {endedCampaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} leadCount={leads.filter((l) => l.campaign_id === c.id).length} />
          ))}
        </div>
      )}

      {view === "antworten" && (
        <div className="space-y-3">
          {responses.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine Antworten dokumentiert.</p>
          ) : (
            responses.map((r) => (
              <div key={r.id} className="space-y-2">
                <ResponseRow {...r} />
                {r.suggested_reply && (
                  <pre className="ml-2 whitespace-pre-wrap rounded-lg bg-violet-50 p-3 text-xs text-slate-800">
                    Vorschlag: {r.suggested_reply}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {view === "demos" && (
        <div className="space-y-3">
          {demos.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine Demos geplant.</p>
          ) : (
            demos.map((d) => <DemoRow key={d.id} {...d} />)
          )}
        </div>
      )}

      {view === "gewonnen" && (
        <div className="space-y-3">
          {wonLeads.map((l) => (
            <CampaignLeadCard key={l.id} lead={l} loading={loading} onAction={updateLead} />
          ))}
        </div>
      )}

      {view === "verloren" && (
        <div className="space-y-3">
          {lostLeads.map((l) => (
            <CampaignLeadCard key={l.id} lead={l} loading={loading} onAction={updateLead} />
          ))}
        </div>
      )}

      {responseLead && (
        <ResponseCaptureForm
          lead={responseLead}
          campaignId={responseLead.campaign_id}
          loading={loading}
          onSubmit={submitResponse}
          onCancel={() => setResponseLead(null)}
        />
      )}

      {demoLead && (
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle>Demo vereinbaren — {demoLead.company_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={demoForm.scheduled_at}
              onChange={(e) => setDemoForm((f) => ({ ...f, scheduled_at: e.target.value }))}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ansprechpartner"
              value={demoForm.contact_name}
              onChange={(e) => setDemoForm((f) => ({ ...f, contact_name: e.target.value }))}
            />
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-slate-300 p-3 text-sm"
              placeholder="Notizen"
              value={demoForm.notes}
              onChange={(e) => setDemoForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button disabled={loading} onClick={submitDemo}>
                Demo speichern
              </Button>
              <Button variant="ghost" onClick={() => setDemoLead(null)}>
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CampaignCard({
  campaign,
  leadCount,
  onApprove,
  loading,
}: {
  campaign: LinkedInCampaign;
  leadCount: number;
  onApprove?: (id: string) => void;
  loading?: boolean;
}) {
  const approved = campaign.approval_status === "approved";
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">
            <Link href={`/jarvis/kampagnen/${campaign.id}`} className="hover:text-violet-700">
              {campaign.name}
            </Link>
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">{campaign.target_group}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className="bg-violet-100 text-violet-800">
            {CAMPAIGN_STATUS_LABELS[campaign.status as keyof typeof CAMPAIGN_STATUS_LABELS] ??
              campaign.status}
          </Badge>
          {approved ? (
            <Badge className="bg-green-100 text-green-800">Freigegeben</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800">Nicht freigegeben</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        {campaign.goal && <p>Ziel: {campaign.goal}</p>}
        <p className="flex items-center gap-1 font-medium text-slate-900">
          <Megaphone className="h-4 w-4" />
          {leadCount} Leads · {campaign.responsible}
        </p>
        {!approved && onApprove && (
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => onApprove(campaign.id)}>
            Gesamte Kampagne freigeben
          </Button>
        )}
        <Link
          href={`/jarvis/kampagnen/${campaign.id}`}
          className="text-sm text-violet-700 hover:underline"
        >
          Kampagne öffnen →
        </Link>
      </CardContent>
    </Card>
  );
}
