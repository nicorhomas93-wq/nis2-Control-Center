import "server-only";
import type Stripe from "stripe";
import { PILOT_PLAN, getStripePriceId } from "@/lib/plans";

export interface PilotCheckoutParams {
  stripe: Stripe;
  customerId: string;
  companyId: string;
  userId: string;
  appUrl: string;
  /** Dauer der Pilotphase in Tagen (Standard: STRIPE_PILOT_TRIAL_DAYS = 30). */
  phaseDays?: number;
}

/**
 * Dauer der einmaligen Pilotphase (Tage), danach muss ein Abo gewählt werden.
 */
export function getPilotPhaseDays(override?: number): number {
  if (override !== undefined && Number.isFinite(override)) {
    return Math.max(1, Math.min(90, Math.floor(override)));
  }

  const raw = process.env.STRIPE_PILOT_TRIAL_DAYS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 30;
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(90, parsed));
}

export function computePilotEndsAt(from: Date, phaseDays?: number): string {
  const days = getPilotPhaseDays(phaseDays);
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return end.toISOString();
}

/** Nur die einmalige Setup-Gebühr (499 €) — kein Abo im Pilot-Checkout. */
export function resolvePilotSetupPriceId(): string {
  const setupPriceId = getStripePriceId(PILOT_PLAN.stripeSetupPriceEnv);
  if (!setupPriceId) {
    throw new Error(`${PILOT_PLAN.stripeSetupPriceEnv} ist nicht konfiguriert.`);
  }
  return setupPriceId;
}

/**
 * Pilot-Checkout: nur 499 € einmalig (mode: payment).
 * Kein Stripe-Abo — nach der Pilotphase wählt der Kunde Basis/Business/Consultant.
 */
export async function createPilotCheckoutSession(
  params: PilotCheckoutParams
): Promise<Stripe.Checkout.Session> {
  const { stripe, customerId, companyId, userId, appUrl } = params;
  const setupPriceId = resolvePilotSetupPriceId();
  const phaseDays = getPilotPhaseDays(params.phaseDays);

  const metadata = {
    company_id: companyId,
    user_id: userId,
    plan: "pilot",
    billing_model: "pilot_one_time",
    pilot_phase_days: String(phaseDays),
  };

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: setupPriceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}&plan=pilot`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
    metadata,
    payment_intent_data: {
      metadata,
    },
    allow_promotion_codes: false,
    billing_address_collection: "required",
    customer_update: {
      address: "auto",
      name: "auto",
    },
  });
}
