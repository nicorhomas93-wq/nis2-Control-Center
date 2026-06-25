"use client";

import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Company } from "@/lib/types";
import {
  getCompanyPlanLabel,
  getCompanyStatusLabel,
  hasActiveAbo,
  hasPaidSubscription,
  isComplimentaryPilot,
  isInPilotPhase,
  needsToChooseAbo,
} from "@/lib/billingAccess";
import { getStripePortalLoginUrl } from "@/lib/stripe-public";

interface BillingStatusBannerProps {
  company: Company | null;
}

export function BillingStatusBanner({ company }: BillingStatusBannerProps) {
  const status = company?.subscription_status ?? "inactive";
  const planLabel = getCompanyPlanLabel(company);
  const isPaid = hasPaidSubscription(company);
  const isFreePilot = isComplimentaryPilot(company);
  const portalLoginUrl = getStripePortalLoginUrl();

  const statusLabel = getCompanyStatusLabel(company);

  const needsAbo = needsToChooseAbo(company);
  const inPilot = isInPilotPhase(company);

  const statusBadgeClass = isFreePilot || hasActiveAbo(company) || inPilot
    ? "bg-emerald-100 text-emerald-800"
    : needsAbo
      ? "bg-amber-100 text-amber-800"
      : status === "past_due"
        ? "bg-red-100 text-red-800"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-brand-100 text-brand-800">{planLabel}</Badge>
        <Badge className={statusBadgeClass}>{statusLabel}</Badge>
        {status === "past_due" && (
          <span className="flex items-center gap-1 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Zahlung fehlgeschlagen
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {needsAbo ? (
          <Link href="/pricing">
            <Button size="sm">Jetzt Abo wählen</Button>
          </Link>
        ) : hasPaidSubscription(company) && !needsAbo ? (
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4" />
              Abo verwalten
            </Button>
          </Link>
        ) : portalLoginUrl && !isFreePilot && hasActiveAbo(company) ? (
          <a href={portalLoginUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4" />
              Stripe Portal
            </Button>
          </a>
        ) : needsAbo ? (
          <Link href="/pricing">
            <Button size="sm">Jetzt Abo wählen</Button>
          </Link>
        ) : isFreePilot ? null : (
          <Link href="/pricing">
            <Button size="sm">Plan auswählen</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
