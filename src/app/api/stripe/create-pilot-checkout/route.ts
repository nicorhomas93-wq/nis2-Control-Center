import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany } from "@/lib/company";
import { getStripe, getAppUrl } from "@/lib/stripe";
import { createPilotCheckoutSession, getPilotPhaseDays } from "@/lib/stripe/pilot-checkout";

/**
 * POST /api/stripe/create-pilot-checkout
 *
 * Pilotpaket (einmalig 499 €):
 * - Kein Abo im Checkout
 * - Nach der Pilotphase wählt der Kunde Basis / Business / Consultant
 *
 * Body (optional): { "phaseDays": 14 | 30 }
 */
export async function POST(request: Request) {
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

    // Pilotpaket ist einmalig — kein zweiter Kauf möglich
    if (company.pilot_setup_paid_at) {
      return NextResponse.json(
        {
            error:
              "Das Pilotpaket wurde bereits gebucht. Wählen Sie nach der Pilotphase ein Abo unter Preise.",
        },
        { status: 409 }
      );
    }

    let phaseDays: number | undefined;
    try {
      const body = await request.json();
      if (body?.phaseDays !== undefined) {
        phaseDays = Number(body.phaseDays);
      } else if (body?.trialDays !== undefined) {
        phaseDays = Number(body.trialDays);
      }
    } catch {
      // leerer Body ist ok
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

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

    const session = await createPilotCheckoutSession({
      stripe,
      customerId,
      companyId: company.id,
      userId: user.id,
      appUrl,
      phaseDays,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout-URL konnte nicht erstellt werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
      phaseDays: getPilotPhaseDays(phaseDays),
    });
  } catch (error) {
    console.error("create-pilot-checkout:", error);
    const message = error instanceof Error ? error.message : "Pilot-Checkout fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
