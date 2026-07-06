import { NextResponse } from "next/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { isLeadResearchCronAuthorized } from "@/lib/jarvis/lead-research/cron-auth";
import { runLeadResearch } from "@/lib/jarvis/lead-research/run-research";

async function handleRun(request: Request) {
  const isCron = isLeadResearchCronAuthorized(request);

  if (!isCron) {
    const access = await requireJarvisApiAccess();
    if (!access.ok) return access.response;
  }

  const result = await runLeadResearch({
    triggerSource: isCron ? "cron" : "manual",
  });

  return NextResponse.json({ ok: result.errors.length === 0 || result.inserted > 0, ...result });
}

export async function GET(request: Request) {
  return handleRun(request);
}

export async function POST(request: Request) {
  return handleRun(request);
}
