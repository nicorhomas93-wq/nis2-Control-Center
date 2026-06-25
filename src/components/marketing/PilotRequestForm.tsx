"use client";

import { useState } from "react";
import { PILOT_CONTACT_EMAIL } from "@/lib/app-config";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Loader2, CheckCircle2, Mail } from "lucide-react";

function buildMailtoHref(form: {
  name: string;
  company: string;
  email: string;
  phone: string;
  industry: string;
  message: string;
}): string {
  const subject = encodeURIComponent(`Pilotanfrage: ${form.company} (${form.name})`);
  const body = encodeURIComponent(
    [
      "Pilotzugang-Anfrage — TKND NIS2 Control Center",
      "",
      `Name: ${form.name}`,
      `Unternehmen: ${form.company}`,
      `E-Mail: ${form.email}`,
      `Telefon: ${form.phone || "—"}`,
      `Branche: ${form.industry || "—"}`,
      "",
      "Nachricht:",
      form.message || "—",
    ].join("\n")
  );
  return `mailto:${PILOT_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

interface PilotRequestFormProps {
  onSuccess?: (result: { emailSent: boolean }) => void;
  defaultMessage?: string;
}

export function PilotRequestForm({ onSuccess, defaultMessage = "" }: PilotRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    industry: "",
    message: defaultMessage,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setWarning(null);

    const res = await fetch("/api/pilot-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(
        data.fallback
          ? `Anfrage konnte nicht gespeichert werden. Bitte kontaktieren Sie uns unter ${PILOT_CONTACT_EMAIL}`
          : (data.error ?? "Anfrage fehlgeschlagen")
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    if (!data.emailSent && data.hint) {
      setWarning(data.hint);
    }
    if (data.localNote) {
      setWarning((prev) => (prev ? `${prev}\n\n${data.localNote}` : data.localNote));
    }
    onSuccess?.({ emailSent: Boolean(data.emailSent) });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="font-medium text-slate-900">Vielen Dank für Ihre Anfrage!</p>
        {!warning && (
          <p className="text-sm text-slate-600">Wir melden uns in Kürze bei Ihnen.</p>
        )}
        {warning && (
          <div className="mt-4 w-full rounded-lg bg-amber-50 px-4 py-3 text-left text-sm leading-relaxed text-amber-900 whitespace-pre-line">
            {warning}
          </div>
        )}
        {warning && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a href={buildMailtoHref(form)} className="inline-flex">
              <Button type="button" variant="outline">
                <Mail className="h-4 w-4" /> Manuell per E-Mail senden
              </Button>
            </a>
            <Button variant="ghost" onClick={() => setSuccess(false)}>
              Schließen
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pilot-name">Name *</Label>
          <Input
            id="pilot-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="pilot-company">Unternehmen *</Label>
          <Input
            id="pilot-company"
            required
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pilot-email">E-Mail *</Label>
          <Input
            id="pilot-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="pilot-phone">Telefon (optional)</Label>
          <Input
            id="pilot-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="pilot-industry">Branche</Label>
        <Input
          id="pilot-industry"
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="pilot-message">Nachricht</Label>
        <Textarea
          id="pilot-message"
          rows={6}
          className="min-h-[140px] w-full"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Kurz beschreiben, was Sie mit dem Pilot erreichen möchten…"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet…
          </>
        ) : (
          "Pilotzugang anfragen"
        )}
      </Button>
    </form>
  );
}
