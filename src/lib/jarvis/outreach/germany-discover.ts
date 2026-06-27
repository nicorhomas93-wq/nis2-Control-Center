import type { SupabaseClient } from "@supabase/supabase-js";
import { GERMANY_LEAD_POOL } from "@/lib/jarvis/outreach/germany-leads";
import {
  QUALIFIED_DEFAULT_LEADS_PER_RUN,
  type QualifiedLeadInput,
} from "@/lib/jarvis/outreach/qualified-lead-types";
import {
  rankQualifiedLeads,
  scoreQualifiedLead,
} from "@/lib/jarvis/outreach/qualified-lead-scoring";

export interface DiscoverGermanyResult {
  inserted: number;
  skipped: number;
  rejected: number;
  leads: Array<{
    company_name: string;
    city: string;
    industry: string;
    employee_count: number;
    score: number;
    relevance_reason: string;
    outreach_hook: string;
  }>;
}

export async function discoverGermanyLeads(
  supabase: SupabaseClient,
  options: { limit?: number; previewOnly?: boolean; pool?: QualifiedLeadInput[] } = {}
): Promise<DiscoverGermanyResult> {
  const limit = options.limit ?? QUALIFIED_DEFAULT_LEADS_PER_RUN;
  const pool = options.pool ?? GERMANY_LEAD_POOL;
  const ranked = rankQualifiedLeads(pool, limit, { scoreLabel: "DE-Score" });

  const allScored = pool.map((lead) => scoreQualifiedLead(lead, { scoreLabel: "DE-Score" }));
  const rejected = allScored.filter((l) => !l.passed).length;

  if (options.previewOnly) {
    return {
      inserted: 0,
      skipped: 0,
      rejected,
      leads: ranked.map((l) => ({
        company_name: l.company_name,
        city: l.city,
        industry: l.industry,
        employee_count: l.employee_count,
        score: l.score,
        relevance_reason: l.relevance_reason,
        outreach_hook: l.outreach_hook,
      })),
    };
  }

  const { data: existing } = await supabase.from("b2b_outreach_leads").select("company_name");
  const names = new Set(
    (existing ?? []).map((r) => r.company_name?.trim().toLowerCase()).filter(Boolean)
  );

  let inserted = 0;
  let skipped = 0;

  for (const lead of ranked) {
    const key = lead.company_name.trim().toLowerCase();
    if (names.has(key)) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from("b2b_outreach_leads").insert({
      company_name: lead.company_name,
      industry: lead.industry,
      city: lead.city,
      region: "Deutschland",
      website: lead.website ?? null,
      employee_count: String(lead.employee_count),
      contact_role: lead.contact_role ?? null,
      hints: lead.hints ?? null,
      source: "germany_discover",
      status: "new",
      nis2_relevance_score: lead.score,
      nis2_likelihood: lead.score >= 7 ? "yes" : "uncertain",
      analysis_bullets: lead.breakdown,
      observation: lead.relevance_reason,
      outreach_hook: lead.outreach_hook,
    });

    if (error) skipped += 1;
    else {
      names.add(key);
      inserted += 1;
    }
  }

  return {
    inserted,
    skipped,
    rejected,
    leads: ranked.map((l) => ({
      company_name: l.company_name,
      city: l.city,
      industry: l.industry,
      employee_count: l.employee_count,
      score: l.score,
      relevance_reason: l.relevance_reason,
      outreach_hook: l.outreach_hook,
    })),
  };
}
