import { NextResponse } from "next/server";
import { captureLeadEmail } from "@/lib/acquisition/automation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const visitorId = body.visitorId as string;
    const email = body.email as string;
    const acquisitionLeadId = body.acquisitionLeadId as string | undefined;

    if (!visitorId || !email?.includes("@")) {
      return NextResponse.json({ error: "visitorId und gültige E-Mail erforderlich" }, { status: 400 });
    }

    await captureLeadEmail(visitorId, email.trim(), acquisitionLeadId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Acquisition] capture-email error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
