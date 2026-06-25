import { NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/acquisition/automation";

export async function POST(request: Request) {
  const secret = process.env.ACQUISITION_CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processEmailQueue();
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
