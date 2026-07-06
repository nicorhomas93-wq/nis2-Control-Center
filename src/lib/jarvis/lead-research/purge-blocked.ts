import type { SupabaseClient } from "@supabase/supabase-js";
import { isBlockedMediaSource } from "@/lib/jarvis/lead-research/media-block";

const BLOCKED_REASON = "Nachrichtenportal / allgemeiner Artikel — kein Lead";

/** Bestehende Medien-/News-Treffer in der DB auf Score 0 setzen und verwerfen. */
export async function purgeBlockedResearchSignals(
  client: SupabaseClient
): Promise<number> {
  const { data, error } = await client
    .from("jarvis_lead_research_signals")
    .select("*")
    .in("status", ["new", "reviewed"])
    .gte("research_score", 1);

  if (error || !data?.length) return 0;

  let purged = 0;

  for (const row of data) {
    if (!isBlockedMediaSource(row)) continue;

    const { error: updateError } = await client
      .from("jarvis_lead_research_signals")
      .update({
        status: "dismissed",
        research_score: 0,
        lead_type: "kein_lead",
        lead_priority: "keine",
        score_reason: BLOCKED_REASON,
        relevance_note: BLOCKED_REASON,
        recommended_action: "Nicht übernehmen",
      })
      .eq("id", row.id);

    if (!updateError) purged++;
  }

  return purged;
}
