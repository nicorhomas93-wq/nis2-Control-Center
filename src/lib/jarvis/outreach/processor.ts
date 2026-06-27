import type { SupabaseClient } from "@supabase/supabase-js";
import type { B2BOutreachLead } from "@/lib/types";
import {
  analyzeLeadFromContext,
  fetchWebsiteSnapshot,
} from "@/lib/jarvis/outreach/website-analyzer";
import { generateOutreachMessage } from "@/lib/jarvis/outreach/prompt-engine";
import { OUTREACH_DAILY_LIMIT } from "@/lib/jarvis/outreach/constants";

export interface ProcessResult {
  processed: number;
  skipped: number;
  errors: string[];
  leads: B2BOutreachLead[];
}

function mapLead(row: Record<string, unknown>): B2BOutreachLead {
  return {
    ...(row as unknown as B2BOutreachLead),
    analysis_bullets: Array.isArray(row.analysis_bullets)
      ? (row.analysis_bullets as string[])
      : [],
  };
}

export async function countProcessedToday(supabase: SupabaseClient): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("b2b_outreach_leads")
    .select("*", { count: "exact", head: true })
    .gte("processed_at", start.toISOString());

  return count ?? 0;
}

export async function getRemainingDailyQuota(supabase: SupabaseClient): Promise<number> {
  const used = await countProcessedToday(supabase);
  return Math.max(0, OUTREACH_DAILY_LIMIT - used);
}

export async function processOutreachLead(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ lead: B2BOutreachLead | null; error: string | null }> {
  const remaining = await getRemainingDailyQuota(supabase);
  if (remaining <= 0) {
    return {
      lead: null,
      error: `Tageslimit erreicht (${OUTREACH_DAILY_LIMIT} Leads/Tag).`,
    };
  }

  const { data: row, error: loadError } = await supabase
    .from("b2b_outreach_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (loadError || !row) {
    return { lead: null, error: loadError?.message ?? "Lead nicht gefunden" };
  }

  if (row.status === "ready" && row.outreach_message) {
    return { lead: mapLead(row), error: null };
  }

  const website = await fetchWebsiteSnapshot(row.website);
  const analysis = analyzeLeadFromContext({
    company_name: row.company_name,
    industry: row.industry,
    employee_count: row.employee_count,
    hints: row.hints,
    website,
  });

  const outreach_message = await generateOutreachMessage({
    company_name: row.company_name,
    industry: row.industry,
    contact_role: row.contact_role,
    contact_name: row.contact_name,
    analysis,
  });

  const { data: updated, error: updateError } = await supabase
    .from("b2b_outreach_leads")
    .update({
      nis2_relevance_score: analysis.nis2_relevance_score,
      nis2_likelihood: analysis.nis2_likelihood,
      it_maturity: analysis.it_maturity,
      analysis_bullets: analysis.analysis_bullets,
      observation: analysis.observation,
      outreach_message,
      status: "ready",
      processed_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select()
    .single();

  if (updateError) {
    return { lead: null, error: updateError.message };
  }

  return { lead: mapLead(updated), error: null };
}

export async function processPendingLeads(
  supabase: SupabaseClient,
  limit?: number
): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    skipped: 0,
    errors: [],
    leads: [],
  };

  const remaining = await getRemainingDailyQuota(supabase);
  const batchSize = Math.min(limit ?? remaining, remaining);

  if (batchSize <= 0) {
    result.errors.push(`Tageslimit erreicht (${OUTREACH_DAILY_LIMIT}/Tag).`);
    return result;
  }

  const { data: pending } = await supabase
    .from("b2b_outreach_leads")
    .select("id")
    .eq("status", "new")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  for (const item of pending ?? []) {
    const { lead, error } = await processOutreachLead(supabase, item.id);
    if (error || !lead) {
      result.errors.push(error ?? "Unbekannter Fehler");
      result.skipped += 1;
      continue;
    }
    result.processed += 1;
    result.leads.push(lead);
  }

  return result;
}

export function leadsToCsv(leads: B2BOutreachLead[]): string {
  const headers = [
    "Firma",
    "Branche",
    "Website",
    "Mitarbeiter",
    "Ansprechpartner",
    "Rolle",
    "E-Mail",
    "NIS2-Score",
    "NIS2",
    "IT-Reife",
    "Was fällt auf",
    "Nachricht",
    "Status",
    "Erstellt",
  ];

  const escape = (v: string | null | undefined) => {
    const s = v ?? "";
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = leads.map((l) =>
    [
      l.company_name,
      l.industry,
      l.website,
      l.employee_count,
      l.contact_name,
      l.contact_role,
      l.contact_email,
      l.nis2_relevance_score != null ? String(l.nis2_relevance_score) : "",
      l.nis2_likelihood,
      l.it_maturity,
      l.observation,
      l.outreach_message,
      l.status,
      l.created_at,
    ]
      .map(escape)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
