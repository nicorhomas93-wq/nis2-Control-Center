"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Shield } from "lucide-react";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StripeTestModeBanner } from "@/components/billing/StripeTestModeBanner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import {
  SUBSCRIPTION_PLANS,
  PILOT_PLAN,
  PILOT_PLAN_PHASE_DAYS_LABEL,
  getPaymentLinkForPlan,
  type CheckoutPlanId,
} from "@/lib/plans";
import { PilotStartButton } from "@/components/billing/PilotStartButton";
import { cn } from "@/lib/utils";

const VALUE_PROPOSITIONS = [
  "Sie sehen jederzeit Ihren aktuellen Sicherheitsstatus",
  "Sie wissen sofort, was zu tun ist",
  "Risiken, Maßnahmen und Dokumentation sind automatisch verknüpft",
  "Ihr System ist jederzeit auditbereit vorbereitet",
  "Prüfungsunterlagen mit einem Klick exportieren",
];

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

    if (plan === "pilot") {
      return;
    }

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

        {/* Hero */}
        <section className="text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
            <Shield className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="mx-auto max-w-4xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Steuern Sie Ihre NIS2-Compliance aktiv – statt sie nur zu dokumentieren.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Live Sicherheitsstatus, klare nächste Schritte und vollständige Audit-Bereitschaft in
            einem System.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/check">
              <Button size="lg">NIS2-Check starten</Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                Demo ansehen
              </Button>
            </Link>
          </div>
        </section>

        {canceled && (
          <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            Checkout abgebrochen. Sie können jederzeit erneut buchen.
          </p>
        )}

        {error && (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        {loadingPlan && (
          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-brand-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Stripe Checkout wird geöffnet…
          </p>
        )}

        {/* Pläne */}
        <section className="mt-16">
          <h2 className="sr-only">Preise und Pakete</h2>
          <div className="grid gap-8 lg:grid-cols-3 lg:items-stretch">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col",
                  plan.highlighted &&
                    "relative z-10 border-brand-400 shadow-xl ring-2 ring-brand-200 lg:scale-[1.04]"
                )}
              >
                <CardHeader className={cn(plan.highlighted && "pb-4")}>
                  {plan.badge && (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      {plan.badge}
                    </span>
                  )}
                  <CardTitle className={cn(plan.highlighted && "text-xl")}>{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  <p className="pt-3">
                    <span
                      className={cn(
                        "font-bold text-slate-900",
                        plan.highlighted ? "text-4xl" : "text-3xl"
                      )}
                    >
                      {plan.price} €
                    </span>
                    <span className="text-slate-500"> / Monat</span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-6">
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    size={plan.highlighted ? "lg" : "md"}
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
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pilot */}
        <Card className="mt-12 border-brand-200 bg-gradient-to-br from-brand-50 to-white">
          <CardHeader>
            <CardTitle>{PILOT_PLAN.name}</CardTitle>
            <CardDescription>
              Einmalige Pilotphase mit persönlichem Onboarding — danach wählen Sie Ihr monatliches
              Abo.
            </CardDescription>
            <p className="pt-2">
              <span className="text-3xl font-bold text-slate-900">{PILOT_PLAN.setup} €</span>
              <span className="text-slate-500"> einmalig</span>
            </p>
            <p className="text-sm text-slate-600">
              {PILOT_PLAN_PHASE_DAYS_LABEL} voller Zugang mit Business-Funktionen. Danach Abo
              wählen: Basis ab 49 €, Business ab 199 € oder Consultant ab 699 € / Monat.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-3 sm:grid-cols-2">
              {PILOT_PLAN.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <PilotStartButton />
          </CardContent>
        </Card>

        {/* Verkaufsargumente */}
        <section className="mt-20 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Was macht das TKND NIS2 Control Center besonders?
          </h2>
          <ul className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-1">
            {VALUE_PROPOSITIONS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-slate-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <span className="text-base">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Vertrauen */}
        <p className="mx-auto mt-12 max-w-2xl text-center text-lg leading-relaxed text-slate-600">
          Kein Chaos bei Prüfungen. Keine unklaren Zustände.
          <br />
          Volle Kontrolle über Ihre NIS2-Compliance – jederzeit.
        </p>

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
