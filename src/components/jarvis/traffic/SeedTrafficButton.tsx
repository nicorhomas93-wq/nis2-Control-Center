"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SeedTrafficButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSeed() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/jarvis/traffic/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Laden fehlgeschlagen");
        return;
      }
      setMessage(
        `Geladen: ${data.groups} Zielgruppen, ${data.profiles} Suchprofile, ${data.outreach} Outreach, ${data.content} Content-Ideen`
      );
      router.refresh();
    } catch {
      setMessage("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleSeed} disabled={loading} size="sm">
        <Database className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
        Standard-Daten laden
      </Button>
      {message && <p className="text-xs text-slate-600">{message}</p>}
    </div>
  );
}
