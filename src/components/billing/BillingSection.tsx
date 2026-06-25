"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Company } from "@/lib/types";
import { getPlanLabel, getSubscriptionStatusLabel } from "@/lib/plans";
import { isComplimentaryPilot } from "@/lib/billingAccess";
import { getStripePortalLoginUrl } from "@/lib/stripe-public";
import { formatDate } from "@/lib/utils";

interface BillingSectionProps {
  company: Company | null;
}

export function BillingSection({ company }: BillingSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portalLoginUrl = getStripePortalLoginUrl();
  const isFreePilot = isComplimentaryPilot(company);

  const hasSubscription =
    Boolean(company?.stripe_customer_id) &&
    (company?.subscription_status === "active" ||
      company?.subscription_status === "trialing" ||
      company?.subscription_status === "past_due");

  const canOpenPortal = !isFreePilot && (hasSubscription || Boolean(portalLoginUrl));

  async function openPortal() {
    setLoading(true);
    setError(null);

    if (portalLoginUrl && !company?.stripe_customer_id) {
      window.location.href = portalLoginUrl;
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (portalLoginUrl) {
          window.location.href = portalLoginUrl;
          return;
        }
        throw new Error(data.error ?? "Portal konnte nicht geöffnet werden");
      }
      window.location.href = data.url;
    } catch (err) {
      if (portalLoginUrl) {
        window.location.href = portalLoginUrl;
        return;
      }
      setError(err instanceof Error ? err.message : "Fehler beim Öffnen des Portals");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-600">Aktueller Plan</span>
        <span className="font-medium text-slate-900">{getPlanLabel(company?.plan)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-600">Abonnement-Status</span>
        <span className="font-medium text-slate-900">
          {getSubscriptionStatusLabel(company?.subscription_status)}
        </span>
      </div>
      {company?.current_period_end && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-600">Aktuelle Periode bis</span>
          <span className="font-medium text-slate-900">
            {formatDate(company.current_period_end)}
          </span>
        </div>
      )}
      {process.env.NODE_ENV === "development" && company?.stripe_customer_id && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-600">Stripe Customer ID (dev)</span>
          <span className="font-mono text-xs text-slate-500">{company.stripe_customer_id}</span>
        </div>
      )}

      {portalLoginUrl && !isFreePilot && (
        <p className="text-xs text-slate-500">
          Abo verwalten, Rechnungen und Zahlungsmethode über das Stripe-Kundenportal.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        {canOpenPortal ? (
          <Button onClick={openPortal} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird geöffnet…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Abo verwalten
              </>
            )}
          </Button>
        ) : isFreePilot ? null : (
          <Link href="/pricing">
            <Button>Plan auswählen</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
