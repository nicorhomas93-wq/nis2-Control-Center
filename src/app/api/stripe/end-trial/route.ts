import { NextResponse } from "next/server";

/**
 * @deprecated Pilot hat kein Stripe-Trial mehr — nach der Pilotphase wird ein Abo gewählt.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Die Pilotphase endet automatisch. Wählen Sie danach unter Preise ein Abo (Basis, Business oder Consultant).",
    },
    { status: 410 }
  );
}
