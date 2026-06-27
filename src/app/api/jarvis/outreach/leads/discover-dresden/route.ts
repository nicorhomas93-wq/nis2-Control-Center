import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { discoverDresdenLeads } from "@/lib/jarvis/outreach/dresden-discover";
import { DRESDEN_MAX_LEADS_PER_RUN } from "@/lib/jarvis/outreach/dresden-scoring";

/**
 * Dresden Top-Leads: gefiltert nach Standort, Größe, Branche, Score ≥ 6.
 * POST { limit?: 15, preview?: true }
 */
export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(
    Math.max(Number(body.limit) || 15, 1),
    DRESDEN_MAX_LEADS_PER_RUN
  );
  const previewOnly = Boolean(body.preview);

  const supabase = await createClient();
  const result = await discoverDresdenLeads(supabase, { limit, previewOnly });

  return NextResponse.json({
    ...result,
    message: previewOnly
      ? `${result.leads.length} qualifizierte Dresden-Leads (Vorschau, Score ≥ 6)`
      : `${result.inserted} Dresden Top-Leads importiert (${result.skipped} bereits vorhanden, ${result.rejected} ausgeschlossen)`,
  });
}

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const result = await discoverDresdenLeads(
    await createClient(),
    { previewOnly: true, limit: DRESDEN_MAX_LEADS_PER_RUN }
  );

  return NextResponse.json(result);
}
