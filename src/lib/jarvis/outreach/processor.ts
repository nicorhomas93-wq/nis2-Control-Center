import type { SupabaseClient } from "@supabase/supabase-js";
import type { B2BOutreachLead } from "@/lib/types";
import {
  analyzeLeadFromContext,
} from "@/lib/jarvis/outreach/website-analyzer";
import { mapOutreachLead, webPresenceFieldsFromResult } from "@/lib/jarvis/outreach/outreach-lead-map";
import { generateOutreachMessage } from "@/lib/jarvis/outreach/prompt-engine";
import { partnerFieldsFromPartnerScore } from "@/lib/jarvis/outreach/partner-fields";
import { scorePartnerLead } from "@/lib/jarvis/outreach/partner-scoring";
import { computeLeadFinderFields } from "@/lib/jarvis/outreach/lead-finder-fields";
import {
  OUTREACH_BATCH_ANALYSIS_LIMIT,
  OUTREACH_DAILY_SEND_LIMIT,
} from "@/lib/jarvis/outreach/constants";
import { getDayStartInTimezone } from "@/lib/jarvis/outreach/day-boundary";

export interface OutreachQuotaInfo {
  sendLimit: number;
  sentToday: number;
  sendRemaining: number;
  sendLimitReached: boolean;
  analyzedToday: number;
}

function getDayStart(): Date {
  return getDayStartInTimezone();
}

export interface ProcessResult {
  processed: number;
  skipped: number;
  errors: string[];
  leads: B2BOutreachLead[];
}

function mapLead(row: Record<string, unknown>): B2BOutreachLead {
  return mapOutreachLead(row);
}

export async function countProcessedToday(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("b2b_outreach_leads")
    .select("*", { count: "exact", head: true })
    .gte("processed_at", getDayStart().toISOString());

  return count ?? 0;
}

export async function countContactedToday(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("b2b_outreach_leads")
    .select("*", { count: "exact", head: true })
    .not("contacted_at", "is", null)
    .gte("contacted_at", getDayStart().toISOString());

  return count ?? 0;
}

export async function getOutreachQuotaInfo(supabase: SupabaseClient): Promise<OutreachQuotaInfo> {
  const [sentToday, analyzedToday] = await Promise.all([
    countContactedToday(supabase),
    countProcessedToday(supabase),
  ]);
  const sendRemaining = Math.max(0, OUTREACH_DAILY_SEND_LIMIT - sentToday);

  return {
    sendLimit: OUTREACH_DAILY_SEND_LIMIT,
    sentToday,
    sendRemaining,
    sendLimitReached: sendRemaining <= 0,
    analyzedToday,
  };
}

/** @deprecated Nutze getOutreachQuotaInfo().sendRemaining */
export async function getRemainingDailyQuota(supabase: SupabaseClient): Promise<number> {
  const quota = await getOutreachQuotaInfo(supabase);
  return quota.sendRemaining;
}

export async function assertCanMarkContacted(
  supabase: SupabaseClient,
  currentStatus: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (currentStatus === "contacted") {
    return { ok: true };
  }

  const sentToday = await countContactedToday(supabase);
  if (sentToday >= OUTREACH_DAILY_SEND_LIMIT) {
    return {
      ok: false,
      error: `Tageslimit erreicht (${OUTREACH_DAILY_SEND_LIMIT} Nachrichten/Tag).`,
    };
  }

  return { ok: true };
}

export async function processOutreachLead(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ lead: B2BOutreachLead | null; error: string | null }> {
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

  const analysis = await analyzeLeadFromContext({
    company_name: row.company_name,
    industry: row.industry,
    employee_count: row.employee_count,
    hints: row.hints,
    website: row.website,
    city: row.city,
    contact_email: row.contact_email,
  });

  const partner = scorePartnerLead({
    company_name: row.company_name,
    industry: row.industry,
    employee_count: row.employee_count,
    city: row.city,
    region: row.region,
    hints: row.hints,
    website: row.website,
    contact_role: row.contact_role,
  });

  const outreach_message = partner.auto_outreach
    ? await generateOutreachMessage({
        company_name: row.company_name,
        industry: row.industry,
        contact_role: row.contact_role,
        contact_name: row.contact_name,
        analysis,
        partner_score: partner.partner_score,
        lead_category: partner.lead_category,
      })
    : null;

  const status = partner.deprioritized
    ? "review_later"
    : outreach_message
      ? "ready"
      : "skipped";

  const contactEmail =
    row.contact_email?.trim() ||
    analysis.discovered_contact_email ||
    analysis.contact_enrichment.contact_email ||
    null;
  const contactPhone =
    row.contact_phone?.trim() || analysis.contact_enrichment.contact_phone || null;
  const hasContactForm =
    row.has_contact_form || analysis.contact_enrichment.has_contact_form || false;
  const linkedinUrl =
    row.linkedin_url?.trim() || analysis.contact_enrichment.linkedin_url || null;
  const website =
    row.website?.trim() || analysis.web_presence.detectedWebsiteUrl || null;

  const finder = computeLeadFinderFields({
    company_name: row.company_name,
    industry: row.industry,
    employee_count: row.employee_count,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    has_contact_form: hasContactForm,
    linkedin_url: linkedinUrl,
    hints: row.hints,
    lead_category: partner.lead_category,
    deprioritized: partner.deprioritized,
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
      contact_email: contactEmail,
      contact_phone: contactPhone,
      has_contact_form: hasContactForm,
      linkedin_url: linkedinUrl,
      website,
      lead_quality_score: finder.lead_quality_score,
      lead_quality_reason: finder.lead_quality_reason,
      is_contactable: finder.is_contactable,
      partner_potential: finder.partner_potential,
      outreach_priority: finder.outreach_priority,
      ...webPresenceFieldsFromResult(analysis.web_presence),
      ...partnerFieldsFromPartnerScore(partner),
      status,
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

  const batchSize = limit ?? OUTREACH_BATCH_ANALYSIS_LIMIT;

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
    "Hook",
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
      l.outreach_hook,
      l.outreach_message,
      l.status,
      l.created_at,
    ]
      .map(escape)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
