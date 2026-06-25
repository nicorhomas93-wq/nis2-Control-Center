import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { handleStripeWebhookEvent } from "@/lib/stripe/webhook-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET fehlt" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Stripe-Signatur fehlt" }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signatur ungültig";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await handleStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook-Verarbeitung fehlgeschlagen" }, { status: 500 });
  }
}
