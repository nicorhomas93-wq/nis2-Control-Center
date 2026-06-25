import { NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/acquisition/automation";

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.ACQUISITION_CRON_SECRET?.trim() ?? process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (secret && auth === `Bearer ${secret}`) return true;
  if (process.env.VERCEL === "1" && vercelCron === "1" && secret) {
    return auth === `Bearer ${secret}`;
  }
  return false;
}

async function handleProcess(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processEmailQueue();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return handleProcess(request);
}

export async function GET(request: Request) {
  return handleProcess(request);
}
