import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { processPendingLeads, processLeadsNeedingEnrichment } from "@/lib/jarvis/outreach/processor";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const limit = body.limit ? Number(body.limit) : undefined;
  const mode = body.mode === "enrich" ? "enrich" : "pending";

  const supabase = await createClient();
  const result =
    mode === "enrich"
      ? await processLeadsNeedingEnrichment(supabase, limit)
      : await processPendingLeads(supabase, limit);

  return NextResponse.json(result);
}
