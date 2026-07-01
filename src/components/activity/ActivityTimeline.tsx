"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatActivityMessage, type ActivityLogRow } from "@/lib/activity/log";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
  companyId: string;
  entityType: string;
  entityId: string;
  title?: string;
  className?: string;
}

export function ActivityTimeline({
  companyId,
  entityType,
  entityId,
  title = "Aktivitätsverlauf",
  className,
}: ActivityTimelineProps) {
  const [activity, setActivity] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/activity?companyId=${companyId}&entityType=${entityType}&entityId=${entityId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setActivity(data.activity ?? []);
    } finally {
      setLoading(false);
    }
  }, [companyId, entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          entityType,
          entityId,
          comment: comment.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Kommentar fehlgeschlagen");
        return;
      }
      setComment("");
      void load();
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submitComment} className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Kommentar oder Rückfrage…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={sending || !comment.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Einträge.</p>
        ) : (
          <ul className="max-h-64 space-y-3 overflow-y-auto">
            {activity.map((row) => (
              <li key={row.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                <p className="text-slate-800">
                  {row.comment ?? formatActivityMessage(row)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(row.created_at).toLocaleString("de-DE")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
