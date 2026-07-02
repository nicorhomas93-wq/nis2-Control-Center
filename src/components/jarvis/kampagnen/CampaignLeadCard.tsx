"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  DEMO_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  RESPONSE_TYPE_LABELS,
} from "@/lib/jarvis/kampagnen/constants";
import type { LinkedInCampaignLead } from "@/lib/types";

interface CampaignLeadCardProps {
  lead: LinkedInCampaignLead;
  loading: boolean;
  onAction: (leadId: string, body: Record<string, unknown>) => Promise<void>;
  onLogResponse?: (lead: LinkedInCampaignLead) => void;
  onScheduleDemo?: (lead: LinkedInCampaignLead) => void;
}

export function CampaignLeadCard({
  lead,
  loading,
  onAction,
  onLogResponse,
  onScheduleDemo,
}: CampaignLeadCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    if (!lead.suggested_message) return;
    await navigator.clipboard.writeText(lead.suggested_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openLinkedIn() {
    if (!lead.linkedin_url) return;
    window.open(lead.linkedin_url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-base">{lead.company_name}</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            {lead.contact_name ? `${lead.contact_name} · ` : ""}
            {lead.category ?? "—"}
            {lead.lead_score != null ? ` · Score ${lead.lead_score}` : ""}
          </p>
        </div>
        <Badge className="bg-violet-100 text-violet-800">
          {LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS] ?? lead.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {lead.next_step && (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Nächster Schritt:</span> {lead.next_step}
          </p>
        )}
        {lead.linkedin_url && (
          <p className="text-xs text-slate-500">
            LinkedIn:{" "}
            <a
              href={lead.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-700 underline"
            >
              Profil öffnen
            </a>
          </p>
        )}
        {lead.website && (
          <p className="text-xs text-slate-500">
            Website:{" "}
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-700 underline"
            >
              {lead.website}
            </a>
          </p>
        )}
        {lead.suggested_message && (
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
            {lead.suggested_message}
          </pre>
        )}
        {(lead.suggested_reply || lead.suggested_message) && lead.status !== "new" && (
          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-violet-800">
              Antwortvorschlag (manuell senden)
            </p>
            <pre className="whitespace-pre-wrap text-xs text-slate-800">
              {lead.suggested_reply ?? lead.suggested_message}
            </pre>
            {lead.offer_notes && (
              <p className="mt-2 text-xs text-amber-800">Angebot: {lead.offer_notes}</p>
            )}
            {lead.suggested_license && (
              <p className="mt-1 text-xs text-slate-600">
                Lizenz-Vorschlag: {lead.suggested_license}
              </p>
            )}
          </div>
        )}
        {lead.notes && <p className="text-xs text-slate-500">Notiz: {lead.notes}</p>}

        <div className="flex flex-wrap gap-2">
          {lead.linkedin_url && (
            <Button size="sm" variant="outline" onClick={openLinkedIn}>
              <ExternalLink className="h-4 w-4" />
              LinkedIn öffnen
            </Button>
          )}
          {lead.suggested_reply && (
            <Button size="sm" variant="outline" onClick={async () => {
              await navigator.clipboard.writeText(lead.suggested_reply!);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              Antwortvorschlag kopieren
            </Button>
          )}
          {lead.suggested_message && !lead.suggested_reply && (
            <Button size="sm" variant="outline" onClick={copyMessage}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              Nachricht kopieren
            </Button>
          )}
          {!["contacted", "replied", "won", "lost"].includes(lead.status) && (
            <Button
              size="sm"
              disabled={loading}
              onClick={() => onAction(lead.id, { status: "contacted" })}
            >
              <UserCheck className="h-4 w-4" />
              Als kontaktiert markieren
            </Button>
          )}
          {lead.status === "contacted" && onLogResponse && (
            <Button size="sm" variant="outline" disabled={loading} onClick={() => onLogResponse(lead)}>
              <MessageSquare className="h-4 w-4" />
              Antwort erhalten
            </Button>
          )}
          {["replied", "demo_scheduled"].includes(lead.status) && onScheduleDemo && (
            <Button size="sm" variant="outline" disabled={loading} onClick={() => onScheduleDemo(lead)}>
              <Calendar className="h-4 w-4" />
              Demo vereinbart
            </Button>
          )}
          {lead.status === "message_prepared" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => onAction(lead.id, { status: "message_prepared" })}
            >
              Nachricht vorbereitet
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Manueller Versand durch Nico — Jarvis sendet nichts automatisch.
        </p>
      </CardContent>
    </Card>
  );
}

export function ResponseRow({
  company_name,
  response_type,
  response_date,
  response_text,
}: {
  company_name: string;
  response_type: string;
  response_date: string;
  response_text: string | null;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-slate-900">{company_name}</p>
            <p className="text-xs text-slate-500">{response_date}</p>
          </div>
          <Badge className="bg-sky-100 text-sky-800">
            {RESPONSE_TYPE_LABELS[response_type as keyof typeof RESPONSE_TYPE_LABELS] ??
              response_type}
          </Badge>
        </div>
        {response_text && <p className="mt-2 text-sm text-slate-700">{response_text}</p>}
      </CardContent>
    </Card>
  );
}

export function DemoRow({
  company_name,
  contact_name,
  scheduled_at,
  status,
  notes,
}: {
  company_name: string;
  contact_name: string | null;
  scheduled_at: string | null;
  status: string;
  notes: string | null;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-slate-900">{company_name}</p>
            <p className="text-xs text-slate-500">
              {contact_name ? `${contact_name} · ` : ""}
              {scheduled_at ? new Date(scheduled_at).toLocaleString("de-DE") : "Termin offen"}
            </p>
          </div>
          <Badge className="bg-indigo-100 text-indigo-800">
            {DEMO_STATUS_LABELS[status as keyof typeof DEMO_STATUS_LABELS] ?? status}
          </Badge>
        </div>
        {notes && <p className="mt-2 text-sm text-slate-600">{notes}</p>}
      </CardContent>
    </Card>
  );
}
