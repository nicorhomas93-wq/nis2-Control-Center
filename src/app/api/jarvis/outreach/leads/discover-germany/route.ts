import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { discoverGermanyLeads } from "@/lib/jarvis/outreach/germany-discover";
import { QUALIFIED_MAX_LEADS_PER_RUN } from "@/lib/jarvis/outreach/qualified-lead-types";

/**
 * Deutschland Top-Leads: Score ≥ 6, max. 20 pro Lauf, Qualität vor Masse.
 */
export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 15, 1), QUALIFIED_MAX_LEADS_PER_RUN);
  const previewOnly = Boolean(body.preview);

  const supabase = await createClient();
  const result = await discoverGermanyLeads(supabase, { limit, previewOnly });

  return NextResponse.json({
    ...result,
    message: previewOnly
      ? `${result.leads.length} qualifizierte DE-Leads (Vorschau, Score ≥ 6)`
      : `${result.inserted} Top-Leads importiert (${result.skipped} Duplikate, ${result.rejected} ausgeschlossen)`,
  });
}

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const result = await discoverGermanyLeads(await createClient(), {
    previewOnly: true,
    limit: QUALIFIED_MAX_LEADS_PER_RUN,
  });

  return NextResponse.json(result);
}
