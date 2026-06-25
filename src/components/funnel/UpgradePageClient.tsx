"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { FunnelLayout } from "@/components/funnel/FunnelLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { loadFunnelResult } from "@/lib/funnel/storage";
import type { CheckoutPlanId } from "@/lib/plans";
import { getPaymentLinkForPlan } from "@/lib/plans";

const plans: {
  id: CheckoutPlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    tagline: "Basis Check + Struktur",
    features: [
      "Betroffenheitscheck",
      "Unternehmensprofil",
      "3 Kern-Dokumente",
      "PDF-Export",
    ],
  },
  {
    id: "business",
    name: "Pro",
    price: 199,
    tagline: "Alle Dokumente + Risikoanalyse",
    highlighted: true,
    features: [
      "Alle Dokumenttypen",
      "Risikoanalyse",
      "Maßnahmen-Tracking",
      "Audit-Ordner + ZIP-Export",
    ],
  },
  {
    id: "consultant",
    name: "Premium",
    price: 699,
    tagline: "Vollsystem + Export + Tracking",
    features: [
      "Vollständiges System",
      "Mehrere Mandanten vorbereitet",
      "Audit-Exports",
      "Priorisierte Features",
    ],
  },
];

const benefits = [
  "Vollständige NIS2-Dokumentation",
  "Strukturierter Audit-Ordner",
  "Maßnahmen-Tracking in Echtzeit",
  "Jederzeit aktueller Compliance-Status",
];

export function UpgradePageClient() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<CheckoutPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadFunnelResult()) {
      router.replace("/check");
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/register?redirect=/upgrade");
        return;
      }
      setIsLoggedIn(true);
    });
  }, [router]);

  async function startCheckout(plan: CheckoutPlanId) {
    setError(null);
    setLoadingPlan(plan);

    const paymentLink = getPaymentLinkForPlan(plan);
    if (paymentLink) {
      window.location.href = paymentLink;
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout fehlgeschlagen");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout fehlgeschlagen");
      setLoadingPlan(null);
    }
  }

  if (isLoggedIn === null) {
    return (
      <FunnelLayout>
        <p className="text-center text-slate-500">Wird geladen…</p>
      </FunnelLayout>
    );
  }

  return (
    <FunnelLayout>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Von Unsicherheit zur prüffertigen NIS2-Struktur
        </h1>
        <p className="mt-2 text-slate-600">Wählen Sie Ihr Paket und starten Sie sofort.</p>
      </div>

      <ul className="mt-8 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            {b}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.highlighted ? "border-brand-300 ring-2 ring-brand-100" : ""}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {plan.highlighted && (
                    <p className="text-xs font-semibold uppercase text-brand-600">Empfohlen</p>
                  )}
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-sm text-slate-500">{plan.tagline}</p>
                </div>
                <p className="text-right">
                  <span className="text-2xl font-bold text-slate-900">{plan.price} €</span>
                  <span className="block text-xs text-slate-500">/Monat</span>
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlighted ? "primary" : "outline"}
                disabled={loadingPlan !== null}
                onClick={() => startCheckout(plan.id)}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wird geöffnet…
                  </>
                ) : (
                  "Jetzt starten"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Sichere Zahlung über Stripe · Monatlich kündbar ·{" "}
        <Link href="/pricing" className="text-brand-600 hover:underline">
          Alle Pakete
        </Link>
      </p>
    </FunnelLayout>
  );
}
