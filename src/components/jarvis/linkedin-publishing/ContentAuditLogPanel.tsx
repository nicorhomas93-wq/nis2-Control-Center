"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { JarvisContentAuditLog } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  created: "Erstellt von Jarvis",
  submitted: "Zur Freigabe eingereicht",
  approved: "Freigegeben",
  scheduled: "Geplant",
  published: "Veröffentlicht",
  campaign_approved: "Kampagne freigegeben",
};

export function ContentAuditLogPanel({ entries }: { entries: JarvisContentAuditLog[] }) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Protokoll</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {entries.slice(0, 15).map((entry) => (
          <div
            key={entry.id}
            className="flex flex-col gap-0.5 border-b border-slate-100 pb-2 last:border-0"
          >
            <div className="flex justify-between gap-2">
              <span className="font-medium text-slate-800">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="text-xs text-slate-400 shrink-0">
                {new Date(entry.created_at).toLocaleString("de-DE")}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {entry.entity_type === "post" ? "Beitrag" : "Kampagne"} · {entry.actor}
              {entry.metadata && typeof entry.metadata === "object" && "title" in entry.metadata
                ? ` · ${String(entry.metadata.title)}`
                : ""}
              {entry.metadata && typeof entry.metadata === "object" && "name" in entry.metadata
                ? ` · ${String(entry.metadata.name)}`
                : ""}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
