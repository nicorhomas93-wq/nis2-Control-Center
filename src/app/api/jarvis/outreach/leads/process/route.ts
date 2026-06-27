import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { processPendingLeads } from "@/lib/jarvis/outreach/processor";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const limit = body.limit ? Number(body.limit) : undefined;

  const supabase = await createClient();
  const result = await processPendingLeads(supabase, limit);

  return NextResponse.json(result);
}
