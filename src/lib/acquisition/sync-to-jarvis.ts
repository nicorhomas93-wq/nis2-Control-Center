import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateLeadScore } from "@/lib/jarvis/lead-scoring";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import type { FunnelCheckResult } from "@/lib/funnel/types";

export async function syncAcquisitionLeadToJarvis(
  admin: SupabaseClient,
  acquisitionLeadId: string
): Promise<string | null> {
  const { data: acqLead } = await admin
    .from("acquisition_leads")
    .select("*")
    .eq("id", acquisitionLeadId)
    .single();

  if (!acqLead?.email) return null;
  if (acqLead.jarvis_lead_id) return acqLead.jarvis_lead_id;

  const funnelResult = acqLead.funnel_result as FunnelCheckResult | null;
  const notes = funnelResult
    ? `NIS2-Check: ${funnelResult.label} (Score ${funnelResult.score}). Acquisition Score: ${acqLead.acquisition_score}.`
    : `Acquisition Score: ${acqLead.acquisition_score}`;

  const jarvisScore = calculateLeadScore({
    source: "nis2_check",
    industry: acqLead.industry,
    email: acqLead.email,
    notes,
    consent_status: "unknown",
  });

  const combinedScore = Math.min(
    100,
    Math.round((jarvisScore.score + acqLead.acquisition_score) / 2)
  );

  const { data: existing } = await admin
    .from("leads")
    .select("id")
    .eq("email", acqLead.email)
    .maybeSingle();

  if (existing) {
    await admin
      .from("leads")
      .update({
        lead_score: combinedScore,
        notes,
        industry: acqLead.industry ?? undefined,
        company_size: acqLead.company_size ?? undefined,
      })
      .eq("id", existing.id);

    await admin
      .from("acquisition_leads")
      .update({ jarvis_lead_id: existing.id })
      .eq("id", acquisitionLeadId);

    return existing.id;
  }

  const { data: newLead, error } = await admin
    .from("leads")
    .insert({
      email: acqLead.email,
      company_name: acqLead.company_name,
      industry: acqLead.industry,
      company_size: acqLead.company_size,
      source: "nis2_check",
      status: "new",
      lead_score: combinedScore,
      notes,
      consent_status: "unknown",
    })
    .select()
    .single();

  if (error || !newLead) {
    console.error("[Acquisition] Jarvis sync failed:", error?.message);
    return null;
  }

  await admin
    .from("acquisition_leads")
    .update({ jarvis_lead_id: newLead.id })
    .eq("id", acquisitionLeadId);

  await admin.from("sales_tasks").insert({
    lead_id: newLead.id,
    title: "NIS2-Check Lead — Erstkontakt",
    description: `Acquisition Score ${acqLead.acquisition_score}. ${acqLead.strong_offer_eligible ? "Starkes Angebot empfohlen." : ""}`,
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "open",
    priority: acqLead.acquisition_score >= 60 ? "high" : "medium",
  });

  await logJarvisEvent(admin, {
    event_type: "acquisition_synced_to_jarvis",
    entity_type: "lead",
    entity_id: newLead.id,
    summary: `NIS2-Check Lead synchronisiert: ${acqLead.email}`,
    details: { acquisitionLeadId, combinedScore },
  });

  return newLead.id;
}
