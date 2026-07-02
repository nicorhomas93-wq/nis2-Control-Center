import type { PartnerScoreResult } from "@/lib/jarvis/outreach/partner-scoring";
import { partnerScoreToLegacy } from "@/lib/jarvis/outreach/partner-scoring";
import type { QualifiedScoreResult } from "@/lib/jarvis/outreach/qualified-lead-types";

export function partnerFieldsFromScoreResult(
  result: Pick<
    QualifiedScoreResult,
    | "partner_score"
    | "lead_category"
    | "score_reason"
    | "recommended_pitch"
    | "recommended_next_step"
    | "deprioritized"
    | "deprioritize_reason"
    | "score"
    | "relevance_reason"
    | "outreach_hook"
    | "breakdown"
  >
): Record<string, unknown> {
  const partnerScore = result.partner_score ?? result.score * 10;
  return {
    partner_score: partnerScore,
    lead_category: result.lead_category ?? null,
    score_reason: result.score_reason ?? result.relevance_reason ?? null,
    recommended_pitch: result.recommended_pitch ?? null,
    recommended_next_step: result.recommended_next_step ?? null,
    deprioritized: result.deprioritized ?? false,
    deprioritize_reason: result.deprioritize_reason ?? null,
    nis2_relevance_score: partnerScoreToLegacy(partnerScore),
    nis2_likelihood: partnerScore >= 60 ? "yes" : partnerScore >= 40 ? "uncertain" : "no",
    analysis_bullets: result.breakdown ?? [],
    observation: result.relevance_reason ?? null,
    outreach_hook: result.outreach_hook ?? null,
    status: result.deprioritized ? "review_later" : "new",
  };
}

export function partnerFieldsFromPartnerScore(result: PartnerScoreResult): Record<string, unknown> {
  return partnerFieldsFromScoreResult({
    partner_score: result.partner_score,
    lead_category: result.lead_category,
    score_reason: result.score_reason,
    recommended_pitch: result.recommended_pitch,
    recommended_next_step: result.recommended_next_step,
    deprioritized: result.deprioritized,
    deprioritize_reason: result.deprioritize_reason,
    score: partnerScoreToLegacy(result.partner_score),
    relevance_reason: result.score_reason,
    outreach_hook: "",
    breakdown: result.breakdown,
  });
}
