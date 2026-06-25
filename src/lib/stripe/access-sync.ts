import "server-only";
import type Stripe from "stripe";

/** Nur aktive oder laufende Testphase = bezahlter Zugang. */
export function accessEnabledFromSubscriptionStatus(
  status: string | null | undefined
): boolean {
  return status === "active" || status === "trialing";
}

export function subscriptionPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const itemEnd = subscription.items.data[0]?.current_period_end;
  const legacyEnd = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const end = itemEnd ?? legacyEnd;
  return end ? new Date(end * 1000).toISOString() : null;
}

/**
 * Felder für companies — ausschließlich aus Stripe-Subscription (Webhook).
 * access_enabled wird NUR hier abgeleitet, nie im Client.
 */
export function subscriptionAccessFields(
  subscription: Stripe.Subscription,
  plan: string | null
): Record<string, unknown> {
  const status = subscription.status;
  return {
    stripe_subscription_id: subscription.id,
    subscription_status: status,
    access_enabled: accessEnabledFromSubscriptionStatus(status),
    current_period_end: subscriptionPeriodEndIso(subscription),
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    ...(plan ? { plan } : {}),
  };
}

/** Abo beendet / unbezahlt — Zugang sperren. */
export function subscriptionRevokedFields(
  options: { keepPilotPlan?: boolean } = {}
): Record<string, unknown> {
  return {
    access_enabled: false,
    subscription_status: "canceled",
    stripe_subscription_id: null,
    ...(options.keepPilotPlan ? {} : { plan: "free" }),
  };
}
