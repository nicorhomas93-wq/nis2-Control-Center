"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SyncPilotRequestsButton({
  unsyncedCount,
}: {
  unsyncedCount?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/jarvis/sync-pilot-requests", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Synchronisierung fehlgeschlagen");
        return;
      }
      setMessage(
        `${data.synced} Lead(s) erstellt, ${data.skipped} übersprungen` +
          (data.errors?.length ? ` — ${data.errors.length} Fehler` : "")
      );
      router.refresh();
    } catch {
      setMessage("Netzwerkfehler bei der Synchronisierung");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
      <Button onClick={handleSync} disabled={loading}>
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Pilotanfragen synchronisieren
        {unsyncedCount ? ` (${unsyncedCount})` : ""}
      </Button>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
