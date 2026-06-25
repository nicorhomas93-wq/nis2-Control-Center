"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Company } from "@/lib/types";
import {
  getCompanyPlanLabel,
  getCompanyStatusLabel,
  hasActiveAbo,
  isComplimentaryPilot,
  isInPilotPhase,
  needsToChooseAbo,
} from "@/lib/billingAccess";
import { getStripePortalLoginUrl } from "@/lib/stripe-public";
import { formatDate } from "@/lib/utils";

interface BillingSectionProps {
  company: Company | null;
  platformOwner?: boolean;
}

export function BillingSection({ company, platformOwner = false }: BillingSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portalLoginUrl = getStripePortalLoginUrl();
  const isFreePilot = isComplimentaryPilot(company, platformOwner);
  const inPilot = isInPilotPhase(company, platformOwner);
  const needsAbo = needsToChooseAbo(company, platformOwner);
  const hasAbo = hasActiveAbo(company);

  const canOpenPortal =
    !isFreePilot && (hasAbo || Boolean(portalLoginUrl)) && Boolean(company?.stripe_subscription_id);

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
        <span className="font-medium text-slate-900">{getCompanyPlanLabel(company, platformOwner)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-600">Status</span>
        <span className="font-medium text-slate-900">{getCompanyStatusLabel(company, platformOwner)}</span>
      </div>

      {platformOwner && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
          Als Plattform-Owner haben Sie <strong>Vollzugang</strong> — kein Pilot- oder Kundenabo nötig.
        </p>
      )}

      {!platformOwner && inPilot && company?.trial_ends_at && (
        <>
          <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-brand-900">
            Sie sind in der <strong>einmaligen Pilotphase</strong>. Danach wählen Sie ein
            monatliches Abo (Basis, Business oder Consultant).
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-600">Pilotphase endet am</span>
            <span className="font-medium text-slate-900">
              {formatDate(company.trial_ends_at)}
            </span>
          </div>
        </>
      )}

      {!platformOwner && needsAbo && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          Ihre Pilotphase ist abgeschlossen. Bitte wählen Sie jetzt ein{" "}
          <strong>monatliches Abo</strong>, um weiterzuarbeiten.
        </p>
      )}

      {!platformOwner && company?.pilot_setup_paid_at && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-600">Pilot gebucht am</span>
          <span className="font-medium text-emerald-700">
            {formatDate(company.pilot_setup_paid_at)}
          </span>
        </div>
      )}

      {company?.current_period_end && hasAbo && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-600">Aktuelle Periode bis</span>
          <span className="font-medium text-slate-900">
            {formatDate(company.current_period_end)}
          </span>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</p>
      )}

      {!platformOwner && (
      <div className="flex flex-wrap gap-3 pt-2">
        {!platformOwner && needsAbo && (
          <Link href="/pricing">
            <Button>Jetzt Abo wählen</Button>
          </Link>
        )}
        {canOpenPortal && (
          <Button onClick={openPortal} disabled={loading} variant={needsAbo ? "outline" : "primary"}>
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
        )}
        {!needsAbo && !canOpenPortal && !isFreePilot && !inPilot && (
          <Link href="/pricing">
            <Button>Plan auswählen</Button>
          </Link>
        )}
        {isFreePilot && (
          <Link href="/pricing">
            <Button variant="outline">Pilotpaket buchen</Button>
          </Link>
        )}
      </div>
      )}
    </div>
  );
}
