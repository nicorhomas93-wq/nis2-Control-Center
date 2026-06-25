const STRIPE_PORTAL_HOST = "billing.stripe.com";

export function getStripePortalLoginUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_STRIPE_PORTAL_LOGIN_URL?.trim();
  if (!raw) return null;

  const url = raw.startsWith("http") ? raw : `https://${raw.replace(/^\/+/, "")}`;
  if (!url.includes(STRIPE_PORTAL_HOST)) return null;
  return url;
}

export function hasStripePortalLogin(): boolean {
  return Boolean(getStripePortalLoginUrl());
}
