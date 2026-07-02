"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_PURPOSE_LABELS,
} from "@/lib/jarvis/traffic/constants";
import type { OutreachDraft } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function OutreachDraftsList({ drafts }: { drafts: OutreachDraft[] }) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyDraft(body: string, id: string) {
    await navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/jarvis/traffic/outreach/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  if (drafts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Keine Outreach-Entwürfe. Standard-Daten laden oder manuell anlegen.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map((draft) => (
        <Card key={draft.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                {draft.subject ??
                  OUTREACH_PURPOSE_LABELS[draft.purpose ?? ""] ??
                  "Outreach-Entwurf"}
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                {OUTREACH_CHANNEL_LABELS[draft.channel ?? ""] ?? draft.channel}
                {draft.target_group?.name ? ` · ${draft.target_group.name}` : ""}
                {draft.tone ? ` · Ton: ${draft.tone}` : ""}
              </p>
            </div>
            <Badge
              className={
                draft.status === "draft"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-800"
              }
            >
              {draft.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {draft.body}
            </pre>
            <p className="text-xs text-slate-400">
              Manuell kopieren und versenden — kein E-Mail-Auto-Versand. Erstellt:{" "}
              {formatDate(draft.created_at)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyDraft(draft.body ?? "", draft.id)}
              >
                {copiedId === draft.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Kopieren
              </Button>
              {draft.status === "draft" && (
                <Button size="sm" onClick={() => updateStatus(draft.id, "approved")}>
                  Freigeben (manuell nutzen)
                </Button>
              )}
              {draft.status === "approved" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(draft.id, "used")}
                >
                  Als verwendet markieren
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateStatus(draft.id, "archived")}
              >
                Archivieren
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
