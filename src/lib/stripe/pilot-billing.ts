import "server-only";

export interface PilotActivationFields {
  stripe_customer_id?: string;
  subscription_status: "pilot_active";
  plan: "pilot";
  trial_ends_at: string;
  pilot_setup_paid_at: string;
  pilot_phase_completed_at?: null;
  access_enabled: false;
  billing_email?: string;
}

/**
 * Felder nach einmaliger Pilot-Zahlung (499 €).
 * Kein Stripe-Abo — Zugang bis trial_ends_at (Pilotende).
 */
export function buildPilotPhaseActivationUpdate(
  pilotEndsAt: string,
  extras: {
    stripe_customer_id?: string;
    billing_email?: string;
  } = {}
): PilotActivationFields {
  const now = new Date().toISOString();
  return {
    plan: "pilot",
    subscription_status: "pilot_active",
    trial_ends_at: pilotEndsAt,
    pilot_setup_paid_at: now,
    pilot_phase_completed_at: null,
    access_enabled: false as const,
    ...(extras.stripe_customer_id ? { stripe_customer_id: extras.stripe_customer_id } : {}),
    ...(extras.billing_email ? { billing_email: extras.billing_email } : {}),
  };
}

export function isPilotSetupPayment(amount: number, currency: string): boolean {
  return amount === 49900 && currency === "eur";
}
