import { NextResponse } from "next/server";
import { processCheckCompleted } from "@/lib/acquisition/automation";
import type { FunnelCheckResult } from "@/lib/funnel/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const visitorId = body.visitorId as string;
    const funnelResult = body.funnelResult as FunnelCheckResult;
    const email = body.email as string | undefined;
    const utm = body.utm as Record<string, string> | undefined;

    if (!visitorId || !funnelResult) {
      return NextResponse.json({ error: "visitorId und funnelResult erforderlich" }, { status: 400 });
    }

    const result = await processCheckCompleted({
      visitorId,
      funnelResult,
      email,
      utm,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Acquisition] check-complete error:", error);
    return NextResponse.json({ leadId: null, score: 0, strongOffer: false }, { status: 500 });
  }
}
