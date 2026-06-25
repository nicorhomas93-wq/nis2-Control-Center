import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany } from "@/lib/company";
import { getStripe, getAppUrl } from "@/lib/stripe";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { company, error: companyError } = await getOrCreateCompany(user.id);
    if (!company) {
      return NextResponse.json(
        { error: companyError ?? "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    if (!company.stripe_customer_id) {
      return NextResponse.json(
        { error: "Kein Stripe-Kunde vorhanden. Bitte zuerst einen Plan buchen." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("create-portal-session:", error);
    const message = error instanceof Error ? error.message : "Portal konnte nicht geöffnet werden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
