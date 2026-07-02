"use client";

import { useEffect, useState } from "react";
import type { ActivityLogRow } from "@/lib/activity/log";
import { formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface EvidenceActivityPanelProps {
  companyId: string;
  entryId: string;
}

export function EvidenceActivityPanel({ companyId, entryId }: EvidenceActivityPanelProps) {
  const [activity, setActivity] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(
        `/api/compliance-evidence/${entryId}/activity?companyId=${companyId}`
      );
      const data = await res.json();
      if (!cancelled && res.ok) setActivity(data.activity ?? []);
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, entryId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Aktivitätsverlauf wird geladen…
      </div>
    );
  }

  if (activity.length === 0) {
    return <p className="text-sm text-slate-500">Noch keine Aktivitäten für diesen Eintrag.</p>;
  }

  return (
    <ul className="space-y-2">
      {activity.map((row) => (
        <li key={row.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <p className="font-medium text-slate-800">{row.comment ?? row.action}</p>
          <p className="text-xs text-slate-500">{formatDate(row.created_at)}</p>
        </li>
      ))}
    </ul>
  );
}
