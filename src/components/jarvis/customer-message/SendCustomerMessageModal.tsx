"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Mail, MessageSquare, Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { buildMailtoUrl } from "@/lib/jarvis/customer-message/channels";
import type {
  CustomerMessageChannel,
  CustomerMessageDelivery,
  CustomerMessageTarget,
} from "@/lib/jarvis/customer-message/types";
import type { JarvisEmailConfig } from "@/lib/jarvis/email-config";
import { JARVIS_DISCLAIMER } from "@/lib/jarvis/constants";
import { cn } from "@/lib/utils";

const CHANNEL_LABELS: Record<CustomerMessageChannel, string> = {
  email: "E-Mail",
  whatsapp: "WhatsApp",
  internal: "Internes Log",
};

interface SendCustomerMessageModalProps {
  open: boolean;
  onClose: () => void;
  target: CustomerMessageTarget;
  onSent?: () => void;
}

export function SendCustomerMessageModal({
  open,
  onClose,
  target,
  onSent,
}: SendCustomerMessageModalProps) {
  const [channel, setChannel] = useState<CustomerMessageChannel>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState<CustomerMessageDelivery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailConfig, setEmailConfig] = useState<JarvisEmailConfig | null>(null);

  useEffect(() => {
    if (!open) return;
    setChannel(target.email ? "email" : target.phone ? "whatsapp" : "internal");
    setSubject(`TKND NIS2 — ${target.companyName}`);
    setBody(target.defaultBody?.trim() ?? "");
    setError(null);
    setSuccess(null);
    setCopied(false);

    fetch("/api/jarvis/email-config")
      .then((res) => res.json())
      .then((data) => setEmailConfig(data))
      .catch(() =>
        setEmailConfig({
          configured: false,
          provider: null,
          label: "E-Mail-Versand nicht eingerichtet",
        })
      );
  }, [open, target]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const canEmail = Boolean(target.email) && !target.consentBlocked;
  const canWhatsApp = Boolean(target.phone) && !target.consentBlocked;
  const mailConfigured = emailConfig?.configured ?? false;

  function fullEmailBody(): string {
    const text = body.trim();
    return text ? `${text}\n\n---\n${JARVIS_DISCLAIMER}` : "";
  }

  async function copyMessage() {
    const text = channel === "email" ? fullEmailBody() : body.trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function submit(delivery: CustomerMessageDelivery) {
    if (!body.trim()) return;

    setLoading(delivery);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/jarvis/customer-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: target.entityType,
          entityId: target.entityId,
          channel: delivery === "internal" ? "internal" : channel,
          delivery,
          subject: channel === "email" ? subject : null,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Aktion fehlgeschlagen");

      if (delivery === "smtp" && data.status === "sent") {
        setSuccess(
          `E-Mail wurde versendet${data.method ? ` (${data.method === "resend" ? "Resend" : "SMTP"})` : ""}.`
        );
      } else if (delivery === "internal") {
        setSuccess("Nachricht intern gespeichert.");
      } else if (delivery === "mailto") {
        if (data.externalUrl) {
          window.location.href = data.externalUrl;
        }
        setSuccess("Nachricht gespeichert — Mailprogramm geöffnet.");
      } else if (delivery === "whatsapp") {
        if (data.externalUrl) {
          window.open(data.externalUrl, "_blank", "noopener,noreferrer");
        }
        setSuccess("Nachricht gespeichert — WhatsApp geöffnet.");
      }

      onSent?.();
      setTimeout(() => onClose(), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      <div
        className={cn(
          "absolute bg-white shadow-xl",
          "inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl"
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4 md:px-6">
          <div className="min-w-0 pr-2">
            <h2 className="text-lg font-bold text-slate-900">Nachricht vorbereiten</h2>
            <p className="mt-1 truncate text-sm text-slate-600">
              {target.companyName}
              {target.contactName ? ` · ${target.contactName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 md:max-h-[70vh] md:px-6">
          <div className="flex flex-wrap gap-2">
            {(["email", "whatsapp", "internal"] as const).map((ch) => {
              const disabled =
                (ch === "email" && !canEmail) ||
                (ch === "whatsapp" && !canWhatsApp) ||
                (target.consentBlocked && ch !== "internal");
              return (
                <button
                  key={ch}
                  type="button"
                  disabled={disabled}
                  onClick={() => setChannel(ch)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    channel === ch
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  {CHANNEL_LABELS[ch]}
                </button>
              );
            })}
          </div>

          {target.consentBlocked && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Externer Kontakt gesperrt — nur internes Log möglich.
            </p>
          )}

          {channel === "email" && emailConfig && !mailConfigured && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              E-Mail-Versand nicht eingerichtet. Nutzen Sie Kopieren oder Mailprogramm öffnen,
              oder konfigurieren Sie RESEND_API_KEY oder SMTP in der Umgebung.
            </p>
          )}

          {channel === "email" && emailConfig?.configured && (
            <p className="text-xs text-slate-500">
              Versand aktiv: {emailConfig.label}
            </p>
          )}

          {channel === "email" && (
            <div>
              <Label htmlFor="msg-subject">Betreff</Label>
              <Input
                id="msg-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
              {target.email && (
                <p className="mt-1 text-xs text-slate-500">An: {target.email}</p>
              )}
            </div>
          )}

          {channel === "whatsapp" && target.phone && (
            <p className="text-xs text-slate-500">WhatsApp: {target.phone}</p>
          )}

          <div>
            <Label htmlFor="msg-body">Nachricht</Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              required
              className="mt-1"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {success}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={!!loading}>
              Abbrechen
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={copyMessage}
              disabled={!!loading || !body.trim()}
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              Kopieren
            </Button>

            {(channel === "email" || channel === "whatsapp") && (
              <Button
                type="button"
                variant="outline"
                onClick={() => submit("internal")}
                disabled={!!loading || !body.trim()}
              >
                {loading === "internal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Intern speichern
              </Button>
            )}

            {channel === "email" && canEmail && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => submit("mailto")}
                  disabled={!!loading || !body.trim()}
                >
                  {loading === "mailto" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Mailprogramm öffnen
                </Button>
                <Button
                  type="button"
                  onClick={() => submit("smtp")}
                  disabled={!!loading || !body.trim() || !mailConfigured}
                  title={!mailConfigured ? "E-Mail-Versand nicht eingerichtet" : undefined}
                >
                  {loading === "smtp" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  E-Mail senden
                </Button>
              </>
            )}

            {channel === "whatsapp" && canWhatsApp && (
              <Button
                type="button"
                onClick={() => submit("whatsapp")}
                disabled={!!loading || !body.trim()}
              >
                {loading === "whatsapp" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                WhatsApp öffnen
              </Button>
            )}

            {channel === "internal" && (
              <Button
                type="button"
                onClick={() => submit("internal")}
                disabled={!!loading || !body.trim()}
              >
                {loading === "internal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Speichern
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
