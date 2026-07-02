"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buildMailtoUrl } from "@/lib/jarvis/customer-message/channels";
import type { JarvisEmailConfig } from "@/lib/jarvis/email-config";
import { JARVIS_DISCLAIMER } from "@/lib/jarvis/constants";
import { formatDate } from "@/lib/utils";
import type { LeadInteraction } from "@/lib/types";

type DraftWithLead = LeadInteraction & {
  lead?: {
    company_name: string | null;
    contact_name: string | null;
    email: string | null;
    consent_status: string;
  } | null;
};

export function EmailDraftsList({
  drafts,
  emailConfig,
}: {
  drafts: DraftWithLead[];
  emailConfig: JarvisEmailConfig;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function draftBody(draft: DraftWithLead): string {
    return `${draft.content ?? ""}\n\n---\n${JARVIS_DISCLAIMER}`;
  }

  async function copyDraft(draft: DraftWithLead) {
    await navigator.clipboard.writeText(draftBody(draft));
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openMailto(draft: DraftWithLead) {
    const email = draft.lead?.email;
    if (!email) return;
    window.location.href = buildMailtoUrl(
      email,
      draft.subject ?? "TKND NIS2 Control Center",
      draftBody(draft)
    );
    setSuccess(`Mailprogramm geöffnet für ${email} (Entwurf unverändert).`);
    setError(null);
  }

  async function sendDraft(id: string) {
    if (
      !confirm(
        "E-Mail jetzt wirklich versenden? Diese Aktion wird protokolliert."
      )
    ) {
      return;
    }

    setLoadingId(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/jarvis/interactions/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Versand fehlgeschlagen");
        return;
      }
      setSuccess(
        `E-Mail wurde versendet${data.method ? ` (${data.method === "resend" ? "Resend" : "SMTP"})` : ""}.`
      );
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Versand");
    } finally {
      setLoadingId(null);
    }
  }

  if (drafts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Keine E-Mail-Entwürfe. Entwürfe werden bei der Pilot-Synchronisierung erstellt.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!emailConfig.configured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          E-Mail-Versand nicht eingerichtet. Entwürfe können kopiert oder per Mailprogramm
          geöffnet werden. Für echten Versand RESEND_API_KEY oder SMTP konfigurieren.
        </p>
      )}

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

      {drafts.map((draft) => (
        <Card key={draft.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{draft.subject ?? "Ohne Betreff"}</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                An: {draft.lead?.email ?? "—"} ({draft.lead?.company_name ?? "—"})
              </p>
            </div>
            <Badge className="bg-amber-100 text-amber-800">Entwurf gespeichert</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {draft.content}
            </pre>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => copyDraft(draft)}>
                {copiedId === draft.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Kopieren
              </Button>
              {draft.lead?.email && (
                <Button size="sm" variant="outline" onClick={() => openMailto(draft)}>
                  <ExternalLink className="h-4 w-4" />
                  Mailprogramm öffnen
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => sendDraft(draft.id)}
                disabled={
                  loadingId === draft.id ||
                  draft.lead?.consent_status === "no_contact" ||
                  !emailConfig.configured
                }
                title={
                  !emailConfig.configured
                    ? "E-Mail-Versand nicht eingerichtet"
                    : undefined
                }
              >
                <Mail className="h-4 w-4" />
                {loadingId === draft.id ? "Wird gesendet…" : "E-Mail senden"}
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Intern gespeichert · Erstellt: {formatDate(draft.created_at)}
              {emailConfig.configured ? ` · Versand: ${emailConfig.label}` : ""}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
