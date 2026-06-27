import { NextResponse } from "next/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import {
  calculateNis2RelevanceScore,
  type Nis2ScoreInput,
} from "@/lib/jarvis/outreach/nis2-relevance-score";
import { fetchWebsiteSnapshot } from "@/lib/jarvis/outreach/website-analyzer";

interface ScoreRequestLead extends Nis2ScoreInput {
  website?: string | null;
  fetch_website?: boolean;
}

/**
 * Bulk-Scoring: Liste filtern & priorisieren ohne CRM-Speicherung.
 * POST { leads: [...], fetch_website?: boolean }
 */
export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const leads = Array.isArray(body.leads) ? (body.leads as ScoreRequestLead[]) : [];
  const fetchWebsite = Boolean(body.fetch_website);

  if (leads.length === 0) {
    return NextResponse.json({ error: "leads-Array fehlt" }, { status: 400 });
  }
  if (leads.length > 100) {
    return NextResponse.json({ error: "Maximal 100 Leads pro Anfrage" }, { status: 400 });
  }

  const results = await Promise.all(
    leads.map(async (lead, index) => {
      const company_name = String(lead.company_name ?? "").trim();
      if (!company_name) {
        return { index, error: "Firmenname fehlt" };
      }

      let website_text = lead.website_text ?? null;
      if (fetchWebsite && lead.website) {
        const snap = await fetchWebsiteSnapshot(lead.website);
        website_text = [snap.title, snap.description, snap.textSample].filter(Boolean).join(" ");
      }

      const scored = calculateNis2RelevanceScore({
        company_name,
        industry: lead.industry ?? null,
        employee_count: lead.employee_count ?? null,
        website_text,
        hints: lead.hints ?? null,
      });

      return {
        index,
        company_name,
        industry: lead.industry ?? null,
        employee_count: lead.employee_count ?? null,
        website: lead.website ?? null,
        ...scored,
      };
    })
  );

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
