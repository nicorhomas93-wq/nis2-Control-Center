import type { SupabaseClient } from "@supabase/supabase-js";
import { DRESDEN_LEAD_POOL } from "@/lib/jarvis/outreach/dresden-leads";
import {
  QUALIFIED_DEFAULT_LEADS_PER_RUN,
} from "@/lib/jarvis/outreach/qualified-lead-types";
import { buildQualifiedLeadInsert } from "@/lib/jarvis/outreach/qualified-lead-insert";
import { rankDresdenLeads, scoreDresdenLead } from "@/lib/jarvis/outreach/dresden-scoring";
import { scoreQualifiedLead } from "@/lib/jarvis/outreach/qualified-lead-scoring";

export interface DiscoverDresdenResult {
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

export async function discoverDresdenLeads(
  supabase: SupabaseClient,
  options: { limit?: number; previewOnly?: boolean } = {}
): Promise<DiscoverDresdenResult> {
  const limit = options.limit ?? QUALIFIED_DEFAULT_LEADS_PER_RUN;
  const ranked = rankDresdenLeads(DRESDEN_LEAD_POOL, limit);
  const allScored = DRESDEN_LEAD_POOL.map((lead) => ({ ...lead, ...scoreDresdenLead(lead) }));
  const rejected = allScored.filter((l) => !l.passed).length;
  let rejectedTotal = rejected;

  if (options.previewOnly) {
    return {
      inserted: 0,
      skipped: 0,
      rejected: rejectedTotal,
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

    const scored = scoreQualifiedLead(lead, { scoreLabel: "DD-Score" });
    const payload = buildQualifiedLeadInsert(lead, scored);
    if (!payload) {
      rejectedTotal += 1;
      continue;
    }

    const { error } = await supabase.from("b2b_outreach_leads").insert({
      ...payload,
      region: "Dresden + 100 km",
      source: "dresden_discover",
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
    rejected: rejectedTotal,
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
