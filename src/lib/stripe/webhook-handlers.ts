import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { planFromPaymentLinkReference, planFromPriceId } from "@/lib/plans";
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

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const itemEnd = subscription.items.data[0]?.current_period_end;
  const legacyEnd = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const end = itemEnd ?? legacyEnd;
  return end ? new Date(end * 1000).toISOString() : null;
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
      if (plan) return plan;
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

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (await eventAlreadyProcessed(event.id)) {
    return;
  }

  let companyId: string | null = null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        companyId = await resolveCompanyIdForCheckout(session, customerId);
        const plan = await resolvePlanFromCheckoutSession(session);
        const billingEmail = session.customer_details?.email ?? session.customer_email ?? undefined;

        if (companyId) {
          await updateCompany(companyId, {
            stripe_customer_id: customerId ?? undefined,
            stripe_subscription_id: subscriptionId ?? undefined,
            subscription_status: "active",
            ...(plan ? { plan } : {}),
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

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        companyId = (subscription.metadata?.company_id as string) ?? null;

        if (!companyId) {
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id;
          companyId = await findCompanyIdByStripeCustomer(customerId);
        }

        if (companyId) {
          const priceId = subscriptionPriceId(subscription);
          const plan = priceId ? planFromPriceId(priceId) : null;
          await updateCompany(companyId, {
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            current_period_end: subscriptionPeriodEnd(subscription),
            trial_ends_at: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            ...(plan ? { plan } : {}),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        companyId = (subscription.metadata?.company_id as string) ?? null;

        if (!companyId) {
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id;
          companyId = await findCompanyIdByStripeCustomer(customerId);
        }

        if (companyId) {
          await updateCompany(companyId, {
            subscription_status: "canceled",
            plan: "free",
            stripe_subscription_id: null,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const admin = createAdminClient();
          if (admin) {
            const { data } = await admin
              .from("companies")
              .select("id")
              .eq("stripe_subscription_id", subscriptionId)
              .maybeSingle();
            companyId = data?.id ?? null;
            if (companyId) {
              await updateCompany(companyId, { subscription_status: "active" });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const admin = createAdminClient();
          if (admin) {
            const { data } = await admin
              .from("companies")
              .select("id")
              .eq("stripe_subscription_id", subscriptionId)
              .maybeSingle();
            companyId = data?.id ?? null;
            if (companyId) {
              await updateCompany(companyId, { subscription_status: "past_due" });
            }
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
