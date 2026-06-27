import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { discoverSeedLeads } from "@/lib/jarvis/outreach/lead-import";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);

  const supabase = await createClient();
  const result = await discoverSeedLeads(supabase, count);

  return NextResponse.json({
    ...result,
    message: `${result.inserted} neue Leads aus Mittelstands-Pool.`,
  });
}
