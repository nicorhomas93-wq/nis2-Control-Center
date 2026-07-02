import type { QualifiedLeadInput, QualifiedScoreResult } from "@/lib/jarvis/outreach/qualified-lead-types";
import { PARTNER_QUALIFIED_SCORE } from "@/lib/jarvis/outreach/constants";
import { PARTNER_CATEGORY_LABELS } from "@/lib/jarvis/outreach/partner-categories";
import {
  partnerScoreToLegacy,
  scorePartnerLead,
} from "@/lib/jarvis/outreach/partner-scoring";
import { buildPartnerOutreachHook } from "@/lib/jarvis/outreach/prompt-engine";

export interface ScoreQualifiedLeadOptions {
  minScore?: number;
  allowedCities?: Set<string> | null;
  scoreLabel?: string;
}

export function scoreQualifiedLead(
  lead: QualifiedLeadInput,
  options: ScoreQualifiedLeadOptions = {}
): QualifiedScoreResult {
  const minScore = options.minScore ?? PARTNER_QUALIFIED_SCORE;

  if (options.allowedCities) {
    const cityOk = options.allowedCities.has(lead.city.trim().toLowerCase());
    if (!cityOk) {
      return reject(`Standort „${lead.city}“ außerhalb der Zielregion`);
    }
  }

  const partner = scorePartnerLead({
    company_name: lead.company_name,
    industry: lead.industry,
    employee_count: lead.employee_count,
    city: lead.city,
    hints: lead.hints,
  });

  const legacyScore = partnerScoreToLegacy(partner.partner_score);
  const industryLabel = PARTNER_CATEGORY_LABELS[partner.lead_category];
  const breakdown = [
    ...(options.scoreLabel ? [`${options.scoreLabel}: ${partner.partner_score}/100`] : []),
    ...partner.breakdown,
  ];

  if (partner.deprioritized) {
    breakdown.unshift(`Depriorisiert: ${partner.deprioritize_reason ?? "Ausschluss-Zielgruppe"}`);
  }

  const relevance_reason = partner.score_reason;
  const outreach_hook = buildPartnerOutreachHook({
    company_name: lead.company_name,
    category: partner.lead_category,
    partner_score: partner.partner_score,
  });

  if (partner.deprioritized || partner.partner_score < PARTNER_QUALIFIED_SCORE) {
    return {
      passed: partner.partner_score >= minScore && !partner.deprioritized,
      score: legacyScore,
      partner_score: partner.partner_score,
      lead_category: partner.lead_category,
      score_reason: partner.score_reason,
      recommended_pitch: partner.recommended_pitch,
      recommended_next_step: partner.recommended_next_step,
      deprioritized: partner.deprioritized,
      deprioritize_reason: partner.deprioritize_reason,
      relevance_reason,
      outreach_hook,
      rejection_reason: partner.deprioritized
        ? partner.deprioritize_reason ?? "Später prüfen"
        : `Partner-Score ${partner.partner_score} unter Minimum (${minScore})`,
      breakdown,
    };
  }

  breakdown.unshift(
    `Partner-Lead: ${partner.partner_score}/100 — ${industryLabel} ✓`
  );

  return {
    passed: true,
    score: legacyScore,
    partner_score: partner.partner_score,
    lead_category: partner.lead_category,
    score_reason: partner.score_reason,
    recommended_pitch: partner.recommended_pitch,
    recommended_next_step: partner.recommended_next_step,
    deprioritized: false,
    deprioritize_reason: null,
    relevance_reason,
    outreach_hook,
    breakdown,
  };
}

function reject(reason: string): QualifiedScoreResult {
  return {
    passed: false,
    score: 0,
    partner_score: 0,
    lead_category: "nicht_priorisiert",
    score_reason: reason,
    recommended_pitch: "",
    recommended_next_step: "Später prüfen",
    deprioritized: true,
    deprioritize_reason: reason,
    relevance_reason: "",
    outreach_hook: "",
    rejection_reason: reason,
    breakdown: [reason],
  };
}

export function rankQualifiedLeads(
  pool: QualifiedLeadInput[],
  limit: number,
  options?: ScoreQualifiedLeadOptions
): Array<QualifiedLeadInput & QualifiedScoreResult> {
  const capped = Math.min(Math.max(limit, 1), 20);
  return pool
    .map((lead) => ({ ...lead, ...scoreQualifiedLead(lead, options) }))
    .filter((l) => l.passed && !l.deprioritized)
    .sort(
      (a, b) =>
        (b.partner_score ?? 0) - (a.partner_score ?? 0) ||
        b.employee_count - a.employee_count
    )
    .slice(0, capped);
}
