export type PlanId = "starter" | "business" | "consultant" | "pilot" | "free";

export interface SubscriptionPlan {
  id: Exclude<CheckoutPlanId, "pilot">;
  name: string;
  price: number;
  interval: "month";
  stripePriceEnv: string;
  stripePaymentLinkEnv?: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

export interface PilotPlan {
  id: "pilot";
  name: string;
  setup: number;
  monthly: number;
  interval: "month";
  stripeMonthlyPriceEnv: string;
  stripeSetupPriceEnv: string;
  features: string[];
  cta: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Basis",
    price: 49,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    stripePaymentLinkEnv: "NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER",
    features: [
      "Unternehmensprofil",
      "Betroffenheitscheck",
      "3 Dokumente",
      "PDF-Export",
      "Basis-Auditübersicht",
    ],
    cta: "Basis buchen",
  },
  {
    id: "business",
    name: "Business",
    price: 199,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_BUSINESS",
    highlighted: true,
    features: [
      "alle Dokumenttypen",
      "Versionierung",
      "Maßnahmen",
      "Risikoanalyse",
      "Incident-Dokumentation",
      "Audit-Ordner",
      "ZIP-Export",
    ],
    cta: "Business buchen",
  },
  {
    id: "consultant",
    name: "Consultant / Systemhaus",
    price: 699,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_CONSULTANT",
    features: [
      "mehrere Mandanten vorbereitet",
      "vollständige Dokumentpakete",
      "Audit-Exports",
      "White-Label vorbereitet",
      "priorisierte Pilotfeatures",
    ],
    cta: "Consultant buchen",
  },
];

export const PILOT_PLAN: PilotPlan = {
  id: "pilot",
  name: "Pilotpaket",
  setup: 499,
  monthly: 99,
  interval: "month",
  stripeMonthlyPriceEnv: "STRIPE_PRICE_PILOT_MONTHLY",
  stripeSetupPriceEnv: "STRIPE_PRICE_PILOT_SETUP",
  features: [
    "Business-Funktionen während der Pilotphase",
    "Persönliches Onboarding",
    "Priorisierter Support",
    "Feedback in die Produktentwicklung",
  ],
  cta: "Pilotpaket starten",
};

export type CheckoutPlanId = "starter" | "business" | "consultant" | "pilot";

export function getStripePriceId(envKey: string): string | null {
  const id = process.env[envKey]?.trim();
  return id || null;
}

export function resolvePriceIdForPlan(plan: CheckoutPlanId): string[] {
  if (plan === "pilot") {
    const monthly = getStripePriceId(PILOT_PLAN.stripeMonthlyPriceEnv);
    const setup = getStripePriceId(PILOT_PLAN.stripeSetupPriceEnv);
    const items: string[] = [];
    if (monthly) items.push(monthly);
  // Stripe Checkout (subscription mode) unterstützt einmalige + wiederkehrende Line Items.
    if (setup) items.push(setup);
    if (items.length === 0) {
      throw new Error("STRIPE_PRICE_PILOT_MONTHLY ist nicht konfiguriert.");
    }
    return items;
  }

  const config = SUBSCRIPTION_PLANS.find((p) => p.id === plan);
  if (!config) throw new Error(`Unbekannter Plan: ${plan}`);
  const priceId = getStripePriceId(config.stripePriceEnv);
  if (!priceId) {
    throw new Error(`${config.stripePriceEnv} ist nicht konfiguriert.`);
  }
  return [priceId];
}

export function planFromPriceId(priceId: string): PlanId | null {
  const map: Array<[string | null | undefined, PlanId]> = [
    [process.env.STRIPE_PRICE_STARTER, "starter"],
    [process.env.STRIPE_PRICE_BUSINESS, "business"],
    [process.env.STRIPE_PRICE_CONSULTANT, "consultant"],
    [process.env.STRIPE_PRICE_PILOT_MONTHLY, "pilot"],
  ];
  for (const [envPrice, plan] of map) {
    if (envPrice && envPrice === priceId) return plan;
  }
  return null;
}

export function getStripePaymentLink(envKey: string): string | null {
  const url = process.env[envKey]?.trim();
  return url?.startsWith("https://buy.stripe.com/") ? url : null;
}

export function getPaymentLinkForPlan(plan: CheckoutPlanId): string | null {
  if (plan === "pilot") return null;
  const config = SUBSCRIPTION_PLANS.find((p) => p.id === plan);
  if (!config?.stripePaymentLinkEnv) return null;
  return getStripePaymentLink(config.stripePaymentLinkEnv);
}

export function getPlanLabel(plan: string | null | undefined): string {
  if (!plan || plan === "free") return "Free";
  if (plan === "starter") return "Basis";
  const sub = SUBSCRIPTION_PLANS.find((p) => p.id === plan);
  if (sub) return sub.name;
  if (plan === "pilot") return PILOT_PLAN.name;
  return plan;
}

export function getSubscriptionStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "active":
      return "Aktiv";
    case "past_due":
      return "Zahlung fehlgeschlagen";
    case "canceled":
      return "Gekündigt";
    case "trialing":
      return "Testphase";
    case "inactive":
      return "Inaktiv";
    default:
      return status ?? "Unbekannt";
  }
}
