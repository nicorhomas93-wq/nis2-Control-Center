import { NextResponse } from "next/server";
import { trackAcquisitionEvent } from "@/lib/acquisition/automation";
import type { AcquisitionEventType } from "@/lib/acquisition/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const visitorId = body.visitorId as string;
    const eventType = body.eventType as AcquisitionEventType;
    const pagePath = body.pagePath as string | undefined;
    const metadata = body.metadata as Record<string, unknown> | undefined;
    const utm = body.utm as Record<string, string> | undefined;

    if (!visitorId || !eventType) {
      return NextResponse.json({ error: "visitorId und eventType erforderlich" }, { status: 400 });
    }

    await trackAcquisitionEvent({
      visitorId,
      eventType,
      pagePath,
      metadata,
      utm,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Acquisition] track error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
