import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany } from "@/lib/company";
import { getStripe, getAppUrl } from "@/lib/stripe";
import { resolvePriceIdForPlan, type CheckoutPlanId } from "@/lib/plans";

const VALID_PLANS: CheckoutPlanId[] = ["starter", "business", "consultant", "pilot"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan as CheckoutPlanId;

    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Ungültiger Plan" }, { status: 400 });
    }

    const { company, error: companyError } = await getOrCreateCompany(user.id);
    if (!company) {
      return NextResponse.json(
        { error: companyError ?? "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const priceIds = resolvePriceIdForPlan(plan);

    let customerId = company.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? company.billing_email ?? undefined,
        name: company.company_name ?? undefined,
        metadata: {
          company_id: company.id,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from("companies")
        .update({ stripe_customer_id: customerId, billing_email: user.email })
        .eq("id", company.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: priceIds.map((price) => ({ price, quantity: 1 })),
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: {
        company_id: company.id,
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          company_id: company.id,
          user_id: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout-URL konnte nicht erstellt werden" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("create-checkout-session:", error);
    const message = error instanceof Error ? error.message : "Checkout fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
