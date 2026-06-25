import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY ist nicht konfiguriert.");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });

  return stripeClient;
}

export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function isStripeTestMode(): boolean {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  return pk.startsWith("pk_test") || sk.startsWith("sk_test");
}
