import { createClient } from "@/lib/supabase/server";
import { scoreLeadQuality } from "@/lib/jarvis/outreach/lead-quality-scoring";
import type { JarvisLeadResearchSignal } from "@/lib/types";

export async function convertResearchSignalToLead(signalId: string): Promise<{
  leadId: string;
  signal: JarvisLeadResearchSignal;
}> {
  const supabase = await createClient();

  const { data: signal, error } = await supabase
    .from("jarvis_lead_research_signals")
    .select("*")
    .eq("id", signalId)
    .single();

  if (error || !signal) {
    throw new Error("Signal nicht gefunden");
  }

  if (signal.b2b_outreach_lead_id) {
    throw new Error("Signal wurde bereits als Lead übernommen");
  }

  const hints = [
    signal.title,
    signal.description,
    signal.demand_signal,
    signal.score_reason,
  ]
    .filter(Boolean)
    .join(" · ");

  const isPartner =
    signal.lead_type === "partner" ||
    (signal.signal_type === "announcement" && signal.industry?.toLowerCase().includes("msp"));

  const quality = scoreLeadQuality({
    company_name: signal.company_name,
    industry: signal.industry,
    hints,
    lead_category: isPartner ? "partner" : undefined,
  });

  const nis2_likelihood =
    signal.research_score >= 80 ? "yes" : signal.research_score >= 60 ? "uncertain" : "uncertain";

  const { data: lead, error: insertError } = await supabase
    .from("b2b_outreach_leads")
    .insert({
      company_name: signal.company_name,
      industry: signal.industry,
      source: "lead_research",
      nis2_likelihood,
      observation: hints,
      analysis_bullets: [
        `Research-Score: ${signal.research_score}`,
        signal.lead_priority ? `Priorität ${signal.lead_priority}` : "",
        signal.demand_signal ?? "",
        signal.recommended_action ? `Aktion: ${signal.recommended_action}` : "",
        signal.tknd_modules?.length ? `TKND: ${signal.tknd_modules.join(", ")}` : "",
        signal.score_reason ?? "",
        signal.source_platform ? `Quelle: ${signal.source_platform}` : "",
      ].filter(Boolean),
      lead_quality_score: Math.max(quality.lead_quality_score, signal.research_score),
      lead_quality_reason: `${signal.score_reason ?? ""} · ${quality.lead_quality_reason}`,
      is_contactable: quality.is_contactable,
      partner_potential: quality.partner_potential,
      outreach_priority: quality.outreach_priority,
      status: "new",
    })
    .select()
    .single();

  if (insertError || !lead) {
    throw new Error(insertError?.message ?? "Lead konnte nicht angelegt werden");
  }

  const { data: updatedSignal, error: updateError } = await supabase
    .from("jarvis_lead_research_signals")
    .update({
      status: "converted",
      b2b_outreach_lead_id: lead.id,
    })
    .eq("id", signalId)
    .select()
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    leadId: lead.id,
    signal: updatedSignal as JarvisLeadResearchSignal,
  };
}
