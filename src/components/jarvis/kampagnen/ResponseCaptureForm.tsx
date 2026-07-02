"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  RESPONSE_CHANNEL_LABELS,
  RESPONSE_TYPE_LABELS,
} from "@/lib/jarvis/kampagnen/constants";
import type { LinkedInCampaignLead } from "@/lib/types";

interface ResponseCaptureFormProps {
  lead: LinkedInCampaignLead;
  campaignId: string;
  loading: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

interface ClassifyPreview {
  response_type: string;
  next_step: string;
  suggested_reply: string;
  task?: { title: string } | null;
}

export function ResponseCaptureForm({
  lead,
  campaignId,
  loading,
  onSubmit,
  onCancel,
}: ResponseCaptureFormProps) {
  const [form, setForm] = useState({
    response_text: "",
    response_type: "auto",
    channel: "linkedin",
    response_date: new Date().toISOString().slice(0, 10),
    response_time: new Date().toTimeString().slice(0, 5),
    contact_name: lead.contact_name ?? "",
    notes: "",
  });
  const [preview, setPreview] = useState<ClassifyPreview | null>(null);

  useEffect(() => {
    if (form.response_text.trim().length < 8) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch("/api/jarvis/kampagnen/responses/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_text: form.response_text,
          response_type: form.response_type === "auto" ? undefined : form.response_type,
          contact_name: form.contact_name,
          company_name: lead.company_name,
          channel: form.channel,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.preview) setPreview(data.preview);
    }, 500);

    return () => clearTimeout(timer);
  }, [form.response_text, form.response_type, form.contact_name, form.channel, lead.company_name]);

  return (
    <Card className="border-sky-200">
      <CardHeader>
        <CardTitle>Antwort erfassen — {lead.company_name}</CardTitle>
        <p className="text-xs text-slate-500">
          Jarvis klassifiziert automatisch und bereitet Aufgabe + Antwortvorschlag vor. Versand
          bleibt manuell durch Nico.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Kanal</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.channel}
              onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
            >
              {Object.entries(RESPONSE_CHANNEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Ansprechpartner</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.contact_name}
              onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Datum</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.response_date}
              onChange={(e) => setForm((f) => ({ ...f, response_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Uhrzeit</label>
            <input
              type="time"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.response_time}
              onChange={(e) => setForm((f) => ({ ...f, response_time: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Antworttext des Interessenten *
          </label>
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-slate-300 p-3 text-sm"
            placeholder="Antwort hier einfügen — Jarvis klassifiziert automatisch…"
            value={form.response_text}
            onChange={(e) => setForm((f) => ({ ...f, response_text: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Klassifizierung (optional überschreiben)
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.response_type}
            onChange={(e) => setForm((f) => ({ ...f, response_type: e.target.value }))}
          >
            <option value="auto">Automatisch erkennen</option>
            {Object.entries(RESPONSE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {preview && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm">
            <p className="font-medium text-emerald-900">
              Erkannt:{" "}
              {RESPONSE_TYPE_LABELS[preview.response_type as keyof typeof RESPONSE_TYPE_LABELS] ??
                preview.response_type}
            </p>
            <p className="mt-1 text-slate-700">Nächster Schritt: {preview.next_step}</p>
            {preview.task?.title && (
              <p className="mt-1 text-slate-600">Aufgabe: {preview.task.title}</p>
            )}
            {preview.suggested_reply && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white/80 p-2 text-xs text-slate-800">
                {preview.suggested_reply}
              </pre>
            )}
          </div>
        )}

        <textarea
          className="min-h-[60px] w-full rounded-lg border border-slate-300 p-3 text-sm"
          placeholder="Interne Notiz (optional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />

        <div className="flex gap-2">
          <Button
            disabled={loading || !form.response_text.trim()}
            onClick={() =>
              onSubmit({
                campaign_id: campaignId,
                lead_id: lead.id,
                company_name: lead.company_name,
                contact_name: form.contact_name,
                channel: form.channel,
                response_date: form.response_date,
                response_time: form.response_time,
                response_text: form.response_text,
                response_type: form.response_type === "auto" ? undefined : form.response_type,
                notes: form.notes,
                recorded_by: "Nico",
              })
            }
          >
            Antwort speichern & automatisieren
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
