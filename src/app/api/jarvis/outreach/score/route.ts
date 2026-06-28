import { NextResponse } from "next/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import {
  calculateNis2RelevanceScore,
  type Nis2ScoreInput,
} from "@/lib/jarvis/outreach/nis2-relevance-score";

/**
 * Bulk-Scoring: Liste filtern & priorisieren ohne CRM-Speicherung.
 * NIS2-Score ausschließlich aus Stammdaten (Größe, Branche, Kritikalität).
 * POST { leads: [...] }
 */
export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const leads = Array.isArray(body.leads) ? (body.leads as Nis2ScoreInput[]) : [];

  if (leads.length === 0) {
    return NextResponse.json({ error: "leads-Array fehlt" }, { status: 400 });
  }
  if (leads.length > 100) {
    return NextResponse.json({ error: "Maximal 100 Leads pro Anfrage" }, { status: 400 });
  }

  const results = leads.map((lead, index) => {
    const company_name = String(lead.company_name ?? "").trim();
    if (!company_name) {
      return { index, error: "Firmenname fehlt" };
    }

    const scored = calculateNis2RelevanceScore({
      company_name,
      industry: lead.industry ?? null,
      employee_count: lead.employee_count ?? null,
      hints: lead.hints ?? null,
    });

    return {
      index,
      company_name,
      industry: lead.industry ?? null,
      employee_count: lead.employee_count ?? null,
      ...scored,
    };
  });

  const ranked = results
    .filter((r): r is Exclude<typeof r, { error: string }> => !("error" in r && r.error))
    .sort((a, b) => b.score - a.score);

  const errors = results.filter((r) => "error" in r && r.error);

  return NextResponse.json({
    total: leads.length,
    ranked,
    errors,
    summary: {
      high: ranked.filter((r) => r.priority === "high").length,
      medium: ranked.filter((r) => r.priority === "medium").length,
      low: ranked.filter((r) => r.priority === "low").length,
    },
  });
}
