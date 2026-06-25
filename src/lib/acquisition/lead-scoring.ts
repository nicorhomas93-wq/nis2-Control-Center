import type { AcquisitionScoreResult } from "@/lib/acquisition/types";
import { STRONG_OFFER_THRESHOLD } from "@/lib/acquisition/types";

export const SCORE_WEIGHTS = {
  check_completed: 50,
  multiple_visits: 20,
  cta_click: 10,
  email_captured: 15,
  upgrade_click: 25,
  high_funnel_result: 20,
} as const;

export type AcquisitionScoreInput = {
  checkCompleted?: boolean;
  visitCount?: number;
  ctaClicks?: number;
  emailCaptured?: boolean;
  upgradeClicked?: boolean;
  funnelScore?: number;
};

export function calculateAcquisitionScore(
  input: AcquisitionScoreInput
): AcquisitionScoreResult {
  let score = 0;
  const reasons: string[] = [];

  if (input.checkCompleted) {
    score += SCORE_WEIGHTS.check_completed;
    reasons.push(`+${SCORE_WEIGHTS.check_completed} Check abgeschlossen`);
  }

  if ((input.visitCount ?? 0) >= 2) {
    score += SCORE_WEIGHTS.multiple_visits;
    reasons.push(`+${SCORE_WEIGHTS.multiple_visits} Mehrfachbesuch`);
  }

  const ctaClicks = input.ctaClicks ?? 0;
  if (ctaClicks > 0) {
    const ctaPoints = Math.min(ctaClicks * SCORE_WEIGHTS.cta_click, 30);
    score += ctaPoints;
    reasons.push(`+${ctaPoints} CTA-Klicks`);
  }

  if (input.emailCaptured) {
    score += SCORE_WEIGHTS.email_captured;
    reasons.push(`+${SCORE_WEIGHTS.email_captured} E-Mail hinterlegt`);
  }

  if (input.upgradeClicked) {
    score += SCORE_WEIGHTS.upgrade_click;
    reasons.push(`+${SCORE_WEIGHTS.upgrade_click} Upgrade-Klick`);
  }

  if ((input.funnelScore ?? 0) >= 60) {
    score += SCORE_WEIGHTS.high_funnel_result;
    reasons.push(`+${SCORE_WEIGHTS.high_funnel_result} Hohes Check-Ergebnis`);
  }

  score = Math.min(100, score);
  const strongOfferEligible = score >= STRONG_OFFER_THRESHOLD;

  if (strongOfferEligible) {
    reasons.push(`→ Stärkeres Angebot (Score ≥ ${STRONG_OFFER_THRESHOLD})`);
  }

  return { score, strongOfferEligible, reasons };
}
