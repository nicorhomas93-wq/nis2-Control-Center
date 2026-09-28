import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { isExploriumConfigured } from "@/lib/jarvis/outreach/explorium-client";
import { discoverExploriumLeads } from "@/lib/jarvis/outreach/explorium-discover";
import { QUALIFIED_MAX_LEADS_PER_RUN } from "@/lib/jarvis/outreach/qualified-lead-types";

export const maxDuration = 60;

/**
 * Neue Partner-Leads aus der Explorium-Firmendatenbank (echte DE-Firmen statt kuratiertem Pool).
 * Body: { limit?: number, preview?: boolean, regions?: string[] }  — regions z. B. ["de-sn", "de-by"]
 */
export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  if (!isExploriumConfigured()) {
    return NextResponse.json(
      { error: "Explorium ist nicht verbunden — EXPLORIUM_API_KEY in .env.local setzen." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), QUALIFIED_MAX_LEADS_PER_RUN);
  const previewOnly = Boolean(body.preview);
  const regionCodes = Array.isArray(body.regions)
    ? body.regions.filter((r: unknown): r is string => typeof r === "string" && /^de-[a-z]{2}$/i.test(r))
    : undefined;

  try {
    const result = await discoverExploriumLeads(await createClient(), {
      limit,
      previewOnly,
      regionCodes,
    });

    return NextResponse.json({
      ...result,
      message: previewOnly
        ? `${result.leads.length} passende Firmen gefunden (Vorschau, ${result.fetched} geprüft)`
        : `${result.inserted} neue Leads aus Explorium importiert (${result.fetched} Firmen geprüft, ${result.skipped} Duplikate, ${result.rejected} ohne Kontaktweg/Score)`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Explorium-Abfrage fehlgeschlagen" },
      { status: 502 }
    );
  }
}
