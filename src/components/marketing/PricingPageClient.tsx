"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StripeTestModeBanner } from "@/components/billing/StripeTestModeBanner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import {
  SUBSCRIPTION_PLANS,
  PILOT_PLAN,
  getPaymentLinkForPlan,
  type CheckoutPlanId,
} from "@/lib/plans";

export function PricingPageClient() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<CheckoutPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
    });
  }, []);

  async function handleCheckout(plan: CheckoutPlanId) {
    setError(null);

    const paymentLink = getPaymentLinkForPlan(plan);
    if (paymentLink) {
      setLoadingPlan(plan);
      window.location.href = paymentLink;
      return;
    }

    if (!isLoggedIn) {
      window.location.href = `/login?redirect=${encodeURIComponent("/pricing")}`;
      return;
    }

    setLoadingPlan(plan);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingHeader />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <StripeTestModeBanner />

        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Preise & Pakete</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Wählen Sie Ihr Paket und schließen Sie Ihr Abo sicher über Stripe ab.
          </p>
        </div>

        {canceled && (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            Checkout abgebrochen. Sie können jederzeit erneut buchen.
          </p>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        {loadingPlan && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-brand-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Stripe Checkout wird geöffnet…
          </p>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={plan.highlighted ? "border-brand-300 shadow-md ring-2 ring-brand-100" : ""}
            >
              <CardHeader>
                {plan.highlighted && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Empfohlen
                  </p>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  {plan.id === "starter"
                    ? "Für kleine Unternehmen und erste Orientierung."
                    : plan.id === "business"
                      ? "Für Unternehmen mit laufender NIS2-Dokumentation."
                      : "Für Berater, IT-Systemhäuser und MSPs."}
                </CardDescription>
                <p className="pt-2">
                  <span className="text-3xl font-bold text-slate-900">{plan.price} €</span>
                  <span className="text-slate-500">/Monat</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "primary" : "outline"}
                  disabled={loadingPlan !== null}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird geöffnet…
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
                <Link href="/demo" className="block">
                  <Button variant="ghost" className="w-full">
                    Demo ansehen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-10 border-brand-200 bg-gradient-to-br from-brand-50 to-white">
          <CardHeader>
            <CardTitle>{PILOT_PLAN.name}</CardTitle>
            <CardDescription>
              Persönliches Onboarding mit Business-Funktionen während der Pilotphase.
            </CardDescription>
            <p className="pt-2">
              <span className="text-3xl font-bold text-slate-900">{PILOT_PLAN.monthly} €</span>
              <span className="text-slate-500">/Monat</span>
              <span className="ml-2 text-sm text-slate-500">
                + {PILOT_PLAN.setup} € Einmal-Setup
              </span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-2 sm:grid-cols-2">
              {PILOT_PLAN.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full sm:w-auto"
              disabled={loadingPlan !== null}
              onClick={() => handleCheckout("pilot")}
            >
              {loadingPlan === "pilot" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird geöffnet…
                </>
              ) : (
                PILOT_PLAN.cta
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-10 text-center text-sm text-slate-500">
          Sichere Zahlung über Stripe. Abos können im Kundenportal verwaltet werden.{" "}
          <Link href="/legal" className="text-brand-600 hover:underline">
            Rechtliche Hinweise
          </Link>
        </p>
      </div>

      <MarketingFooter />
    </div>
  );
}
