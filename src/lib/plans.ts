export type PlanId = "starter" | "business" | "consultant" | "pilot" | "free";

export interface SubscriptionPlan {
  id: Exclude<CheckoutPlanId, "pilot">;
  name: string;
  description: string;
  price: number;
  interval: "month";
  stripePriceEnv: string;
  stripePaymentLinkEnv?: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
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
    description: "Für kleine Unternehmen zur ersten Orientierung.",
    price: 49,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    stripePaymentLinkEnv: "NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER",
    features: [
      "Unternehmensprofil",
      "Betroffenheitscheck",
      "Grundlegende Dokumente",
      "PDF-Export",
      "Einfache Audit-Übersicht",
    ],
    cta: "Basis buchen",
  },
  {
    id: "business",
    name: "Business",
    description: "Für Unternehmen, die ihre NIS2-Compliance aktiv steuern möchten.",
    price: 199,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_BUSINESS",
    stripePaymentLinkEnv: "NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BUSINESS",
    highlighted: true,
    badge: "Empfohlen",
    features: [
      "Live Sicherheitsstatus (Score 0–100)",
      "Klare Handlungsempfehlungen („Was ist jetzt zu tun?“)",
      "Automatische Risiko- und Maßnahmensteuerung",
      "Audit-Bereitschaft in Echtzeit",
      "Incident-Dokumentation und Abschluss-Workflows",
      "Top-Risiken und Score-Ursachen auf einen Blick",
      "Vollständiger Audit-Ordner",
      "ZIP-Export für Prüfungen",
    ],
    cta: "Business buchen",
  },
  {
    id: "consultant",
    name: "Consultant / Systemhaus",
    description: "Für Berater, IT-Systemhäuser und MSPs",
    price: 699,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_CONSULTANT",
    stripePaymentLinkEnv: "NEXT_PUBLIC_STRIPE_PAYMENT_LINK_CONSULTANT",
    features: [
      "Verwaltung mehrerer Mandanten",
      "Compliance-Steuerung pro Kunde",
      "Live Sicherheitsstatus je Unternehmen",
      "Zentrale Audit-Übersicht",
      "Vollständige Audit-Exports für Kunden",
      "Skalierbares Compliance-System",
      "White-Label inklusive",
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
    "Danach: Abo nach Wahl (Basis / Business / Consultant)",
  ],
  cta: "Pilotpaket starten",
};

/** Anzeige: Dauer der einmaligen Pilotphase (sollte STRIPE_PILOT_TRIAL_DAYS entsprechen). */
export const PILOT_PLAN_PHASE_DAYS_LABEL = "30 Tage";

export type CheckoutPlanId = "starter" | "business" | "consultant" | "pilot";

export function getStripePriceId(envKey: string): string | null {
  const id = process.env[envKey]?.trim();
  return id || null;
}

export function resolvePriceIdForPlan(plan: CheckoutPlanId): string[] {
  if (plan === "pilot") {
    throw new Error(
      "Pilot nutzt create-pilot-checkout (einmalige Zahlung). Für Abos: starter, business oder consultant."
    );
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

export function planFromPaymentLinkReference(reference: string | null | undefined): PlanId | null {
  if (!reference) return null;
  const ref = reference.toLowerCase();

  for (const plan of SUBSCRIPTION_PLANS) {
    const envKey = plan.stripePaymentLinkEnv;
    if (!envKey) continue;
    const url = getStripePaymentLink(envKey);
    if (!url) continue;
    const slug = url.split("/").pop()?.toLowerCase();
    if (slug && ref.includes(slug)) return plan.id;
  }

  return null;
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
    case "pilot_active":
      return "Pilotphase aktiv";
    case "inactive":
      return "Inaktiv";
    default:
      return status ?? "Unbekannt";
  }
}
