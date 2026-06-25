"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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

export function EmailDraftsList({ drafts }: { drafts: DraftWithLead[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendDraft(id: string) {
    if (
      !confirm(
        "E-Mail manuell freigeben und versenden? Diese Aktion wird protokolliert."
      )
    ) {
      return;
    }

    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/jarvis/interactions/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Versand fehlgeschlagen");
        return;
      }
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
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
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
            <Badge className="bg-amber-100 text-amber-800">Entwurf</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {draft.content}
            </pre>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => sendDraft(draft.id)}
                disabled={loadingId === draft.id || draft.lead?.consent_status === "no_contact"}
              >
                {loadingId === draft.id ? "Wird gesendet…" : "Manuell freigeben & senden"}
              </Button>
              <span className="text-xs text-slate-400">
                Erstellt: {formatDate(draft.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
