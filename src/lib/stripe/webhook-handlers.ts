import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { planFromPaymentLinkReference, planFromPriceId } from "@/lib/plans";
import {
  subscriptionAccessFields,
  subscriptionRevokedFields,
} from "@/lib/stripe/access-sync";
import {
  buildPilotPhaseActivationUpdate,
  isPilotSetupPayment,
} from "@/lib/stripe/pilot-billing";
import { computePilotEndsAt, getPilotPhaseDays } from "@/lib/stripe/pilot-checkout";
import {
  findCompanyIdByEmail,
  findCompanyIdByStripeCustomer,
} from "@/lib/stripe/company-resolve";

async function eventAlreadyProcessed(stripeEventId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data } = await admin
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  return Boolean(data);
}

async function logBillingEvent(
  companyId: string | null,
  stripeEventId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("billing_events").insert({
    company_id: companyId,
    stripe_event_id: stripeEventId,
    event_type: eventType,
    payload,
  });
}

async function updateCompany(
  companyId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase Admin Client nicht verfügbar.");

  const { error } = await admin.from("companies").update(fields).eq("id", companyId);
  if (error) throw error;
}

function subscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  return item?.price?.id ?? null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const sub =
    invoice.parent?.subscription_details?.subscription ?? legacy.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

function customerIdFromObject(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function resolvePlanFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<string | null> {
  const metadataPlan = session.metadata?.plan;
  if (metadataPlan) return metadataPlan;

  const paymentLinkPlan = planFromPaymentLinkReference(
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link?.id ?? session.url ?? undefined
  );
  if (paymentLinkPlan) return paymentLinkPlan;

  try {
    const stripe = getStripe();
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });
    const priceId = full.line_items?.data?.[0]?.price;
    const id = typeof priceId === "string" ? priceId : priceId?.id;
    if (id) {
      const plan = planFromPriceId(id);
      if (plan && plan !== "pilot") return plan;
    }
    return planFromPaymentLinkReference(full.url ?? undefined);
  } catch {
    return planFromPaymentLinkReference(session.url ?? undefined);
  }
}

async function resolveCompanyIdForCheckout(
  session: Stripe.Checkout.Session,
  customerId: string | null | undefined
): Promise<string | null> {
  const metadataCompanyId = session.metadata?.company_id as string | undefined;
  if (metadataCompanyId) return metadataCompanyId;

  const byCustomer = await findCompanyIdByStripeCustomer(customerId);
  if (byCustomer) return byCustomer;

  const email = session.customer_details?.email ?? session.customer_email;
  return findCompanyIdByEmail(email);
}

async function syncSubscriptionToCompany(
  companyId: string,
  subscriptionId: string,
  planHint?: string | null
): Promise<void> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscriptionPriceId(subscription);
  const planFromPrice = priceId ? planFromPriceId(priceId) : null;
  const plan =
    planHint && planHint !== "pilot" ? planHint : planFromPrice && planFromPrice !== "pilot" ? planFromPrice : null;

  if (!plan) return;

  await updateCompany(companyId, subscriptionAccessFields(subscription, plan));
}

async function activatePaidPilotPhase(
  companyId: string,
  session: Stripe.Checkout.Session,
  customerId: string | null,
  billingEmail?: string
): Promise<void> {
  const phaseDaysRaw = session.metadata?.pilot_phase_days;
  const phaseDays = phaseDaysRaw ? Number.parseInt(phaseDaysRaw, 10) : undefined;
  const pilotEndsAt = computePilotEndsAt(new Date(), phaseDays);

  await updateCompany(companyId, {
    ...buildPilotPhaseActivationUpdate(pilotEndsAt, {
      stripe_customer_id: customerId ?? undefined,
      billing_email: billingEmail,
    }),
  });
}

async function markPilotCompletedIfNeeded(companyId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { data } = await admin
    .from("companies")
    .select("pilot_setup_paid_at, pilot_phase_completed_at")
    .eq("id", companyId)
    .maybeSingle();

  if (data?.pilot_setup_paid_at && !data.pilot_phase_completed_at) {
    await updateCompany(companyId, {
      pilot_phase_completed_at: new Date().toISOString(),
    });
  }
}

async function findCompanyIdBySubscription(subscriptionId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("companies")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  return data?.id ?? null;
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (await eventAlreadyProcessed(event.id)) {
    return;
  }

  let companyId: string | null = null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = customerIdFromObject(session.customer);
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        companyId = await resolveCompanyIdForCheckout(session, customerId);
        const plan = await resolvePlanFromCheckoutSession(session);
        const billingEmail = session.customer_details?.email ?? session.customer_email ?? undefined;

        if (companyId && plan === "pilot" && session.mode === "payment") {
          await activatePaidPilotPhase(companyId, session, customerId, billingEmail);
        } else if (
          companyId &&
          subscriptionId &&
          plan &&
          plan !== "pilot" &&
          session.payment_status === "paid"
        ) {
          await updateCompany(companyId, {
            stripe_customer_id: customerId ?? undefined,
            ...(billingEmail ? { billing_email: billingEmail } : {}),
          });
          await syncSubscriptionToCompany(companyId, subscriptionId, plan);
          await markPilotCompletedIfNeeded(companyId);
        } else if (companyId) {
          await updateCompany(companyId, {
            stripe_customer_id: customerId ?? undefined,
            ...(billingEmail ? { billing_email: billingEmail } : {}),
          });
        } else {
          console.warn(
            "checkout.session.completed: Keine Company gefunden für E-Mail",
            billingEmail ?? "unbekannt"
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        companyId = (subscription.metadata?.company_id as string) ?? null;

        if (!companyId) {
          companyId = await findCompanyIdByStripeCustomer(
            customerIdFromObject(subscription.customer)
          );
        }

        if (companyId) {
          const priceId = subscriptionPriceId(subscription);
          const plan = priceId ? planFromPriceId(priceId) : null;
          if (plan && plan !== "pilot") {
            await updateCompany(companyId, subscriptionAccessFields(subscription, plan));
            if (event.type === "customer.subscription.created") {
              await markPilotCompletedIfNeeded(companyId);
            }
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const customerId = customerIdFromObject(paymentIntent.customer);
        const isPilot =
          paymentIntent.metadata?.plan === "pilot" ||
          paymentIntent.metadata?.billing_model === "pilot_one_time" ||
          isPilotSetupPayment(paymentIntent.amount, paymentIntent.currency);

        if (!isPilot) break;

        companyId = await findCompanyIdByStripeCustomer(customerId);
        if (companyId) {
          const phaseDays = paymentIntent.metadata?.pilot_phase_days
            ? Number.parseInt(paymentIntent.metadata.pilot_phase_days, 10)
            : getPilotPhaseDays();
          const pilotEndsAt = computePilotEndsAt(new Date(), phaseDays);

          await updateCompany(companyId, {
            ...buildPilotPhaseActivationUpdate(pilotEndsAt, {
              stripe_customer_id: customerId ?? undefined,
            }),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        companyId = (subscription.metadata?.company_id as string) ?? null;

        if (!companyId) {
          companyId = await findCompanyIdByStripeCustomer(
            customerIdFromObject(subscription.customer)
          );
        }

        if (companyId) {
          const admin = createAdminClient();
          const { data } = admin
            ? await admin
                .from("companies")
                .select("pilot_setup_paid_at")
                .eq("id", companyId)
                .maybeSingle()
            : { data: null };

          await updateCompany(companyId, {
            ...subscriptionRevokedFields({ keepPilotPlan: Boolean(data?.pilot_setup_paid_at) }),
            ...(data?.pilot_setup_paid_at ? { plan: "pilot" } : {}),
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);

        if (subscriptionId) {
          companyId = await findCompanyIdBySubscription(subscriptionId);
          if (companyId) {
            await syncSubscriptionToCompany(companyId, subscriptionId);
            await markPilotCompletedIfNeeded(companyId);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);

        if (subscriptionId) {
          companyId = await findCompanyIdBySubscription(subscriptionId);
          if (companyId) {
            await updateCompany(companyId, {
              subscription_status: "past_due",
              access_enabled: false,
            });
          }
        }
        break;
      }

      default:
        break;
    }

    await logBillingEvent(
      companyId,
      event.id,
      event.type,
      event.data.object as unknown as Record<string, unknown>
    );
  } catch (error) {
    console.error(`Stripe webhook error (${event.type}):`, error);
    throw error;
  }
}
