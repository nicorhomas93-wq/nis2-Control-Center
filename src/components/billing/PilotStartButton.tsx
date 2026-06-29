"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PILOT_PLAN } from "@/lib/plans";

interface PilotStartButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "ghost";
  /** Dauer der Pilotphase in Tagen (optional, Standard: 30). */
  phaseDays?: number;
  label?: string;
}

/**
 * „Pilotpaket starten“ → 499 € einmalig → danach Abo wählen.
 */
export function PilotStartButton({
  className,
  size = "lg",
  variant = "primary",
  phaseDays,
  label = PILOT_PLAN.cta,
}: PilotStartButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPilot() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/create-pilot-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(phaseDays !== undefined ? { phaseDays } : {}),
      });

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Pilot-Checkout fehlgeschlagen");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pilot-Checkout fehlgeschlagen");
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        className="w-auto"
        size={size}
        variant={variant}
        disabled={loading}
        onClick={startPilot}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Stripe wird geöffnet…
          </>
        ) : (
          label
        )}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
