"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CampaignLeadCard } from "@/components/jarvis/kampagnen/CampaignLeadCard";
import { ResponseCaptureForm } from "@/components/jarvis/kampagnen/ResponseCaptureForm";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/jarvis/kampagnen/constants";
import type {
  LinkedInCampaign,
  LinkedInCampaignDemo,
  LinkedInCampaignLead,
  LinkedInCampaignResponse,
} from "@/lib/types";

interface CampaignDetailClientProps {
  campaign: LinkedInCampaign;
  leads: LinkedInCampaignLead[];
  responses: LinkedInCampaignResponse[];
  demos: LinkedInCampaignDemo[];
}

export function CampaignDetailClient({
  campaign,
  leads,
  responses,
  demos,
}: CampaignDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [responseLead, setResponseLead] = useState<LinkedInCampaignLead | null>(null);
  const [demoLead, setDemoLead] = useState<LinkedInCampaignLead | null>(null);
  const [leadForm, setLeadForm] = useState({
    company_name: "",
    contact_name: "",
    linkedin_url: "",
    website: "",
    lead_score: "",
    notes: "",
  });
  const [demoForm, setDemoForm] = useState({ scheduled_at: "", notes: "" });

  async function apiCall(url: string, method: string, body?: unknown) {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{campaign.name}</h2>
          <p className="text-sm text-slate-500">
            {campaign.target_group} · {campaign.responsible}
          </p>
          {campaign.description && (
            <p className="mt-2 text-sm text-slate-600">{campaign.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-violet-100 text-violet-800">
            {CAMPAIGN_STATUS_LABELS[campaign.status as keyof typeof CAMPAIGN_STATUS_LABELS] ??
              campaign.status}
          </Badge>
          {campaign.status !== "active" && (
            <Button
              size="sm"
              disabled={loading}
              onClick={() =>
                apiCall(`/api/jarvis/kampagnen/${campaign.id}`, "PATCH", { status: "active" })
              }
            >
              Aktivieren
            </Button>
          )}
          {campaign.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() =>
                apiCall(`/api/jarvis/kampagnen/${campaign.id}`, "PATCH", { status: "paused" })
              }
            >
              Pausieren
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Leads", value: leads.length },
          { label: "Kontaktiert", value: leads.filter((l) => l.status === "contacted" || l.status === "replied").length },
          { label: "Antworten", value: responses.length },
          { label: "Demos", value: demos.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShowLeadForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Lead hinzufügen
        </Button>
      </div>

      {showLeadForm && (
        <Card>
          <CardHeader>
            <CardTitle>Lead zur Kampagne</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await apiCall(`/api/jarvis/kampagnen/${campaign.id}/leads`, "POST", {
                  ...leadForm,
                  lead_score: leadForm.lead_score ? Number(leadForm.lead_score) : null,
                });
                setShowLeadForm(false);
                setLeadForm({
                  company_name: "",
                  contact_name: "",
                  linkedin_url: "",
                  website: "",
                  lead_score: "",
                  notes: "",
                });
              }}
            >
              {(
                [
                  ["company_name", "Firmenname *"],
                  ["contact_name", "Ansprechpartner"],
                  ["linkedin_url", "LinkedIn URL"],
                  ["website", "Website"],
                  ["lead_score", "Lead Score"],
                  ["notes", "Notizen"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={key === "notes" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={leadForm[key]}
                    onChange={(e) => setLeadForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={key === "company_name"}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={loading}>
                  Lead speichern
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="font-medium text-slate-900">Leads in dieser Kampagne</h3>
        {leads.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Leads — oben hinzufügen.</p>
        ) : (
          leads.map((lead) => (
            <CampaignLeadCard
              key={lead.id}
              lead={lead}
              loading={loading}
              onAction={(id, body) => apiCall(`/api/jarvis/kampagnen/leads/${id}`, "PATCH", body)}
              onLogResponse={setResponseLead}
              onScheduleDemo={setDemoLead}
            />
          ))
        )}
      </div>

      {responseLead && (
        <ResponseCaptureForm
          lead={responseLead}
          campaignId={campaign.id}
          loading={loading}
          onSubmit={async (payload) => {
            await apiCall("/api/jarvis/kampagnen/responses", "POST", payload);
            setResponseLead(null);
          }}
          onCancel={() => setResponseLead(null)}
        />
      )}

      {demoLead && (
        <Card>
          <CardHeader>
            <CardTitle>Demo — {demoLead.company_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={demoForm.scheduled_at}
              onChange={(e) => setDemoForm((f) => ({ ...f, scheduled_at: e.target.value }))}
            />
            <textarea
              className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              value={demoForm.notes}
              onChange={(e) => setDemoForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <Button
              disabled={loading}
              onClick={async () => {
                await apiCall("/api/jarvis/kampagnen/demos", "POST", {
                  campaign_id: campaign.id,
                  lead_id: demoLead.id,
                  company_name: demoLead.company_name,
                  contact_name: demoLead.contact_name,
                  ...demoForm,
                });
                setDemoLead(null);
              }}
            >
              Demo speichern
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
