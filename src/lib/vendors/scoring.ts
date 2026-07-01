import type {
  VendorCriticality,
  VendorEvidence,
  VendorEvidenceStatus,
  VendorQuestionnaireAnswers,
  VendorRiskLevel,
} from "@/lib/vendors/types";
import { requiredEvidenceForCriticality, requiredEvidenceForVendor } from "@/lib/vendors/evidence-types";
import { normalizeEvidenceStatus } from "@/lib/vendors/evidence-status";
import { getProviderRiskFloor } from "@/lib/vendors/provider-catalog";

const CRITICALITY_BASE_RISK: Record<VendorCriticality, VendorRiskLevel> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const RISK_ORDER: VendorRiskLevel[] = ["low", "medium", "high", "critical"];

function riskMax(a: VendorRiskLevel, b: VendorRiskLevel): VendorRiskLevel {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

function answerPoints(
  answer: string | undefined,
  yes: number,
  no: number,
  unknown = Math.round((yes + no) / 2)
): number {
  if (answer === "yes") return yes;
  if (answer === "no") return no;
  return unknown;
}

export function scoreQuestionnaire(answers: VendorQuestionnaireAnswers): number {
  const points = [
    answerPoints(answers.iso_27001, 20, 0, 8),
    answerPoints(answers.notfallkonzept, 20, 0, 8),
    answerPoints(answers.info_security_policy, 15, 0, 6),
    answerPoints(answers.security_incidents_12m, 0, 15, 8),
    answerPoints(answers.processes_personal_data, 10, 15, 12),
  ];
  const max = 80;
  const sum = points.reduce((a, b) => a + b, 0);
  return Math.min(100, Math.round((sum / max) * 100));
}

function evidenceStatusPoints(status: VendorEvidenceStatus | string): number {
  const normalized = normalizeEvidenceStatus(status);
  switch (normalized) {
    case "fulfilled":
      return 100;
    case "in_progress":
      return 50;
    case "not_applicable":
      return 100;
    case "not_fulfilled":
    default:
      return 0;
  }
}

export function scoreEvidence(
  evidence: VendorEvidence[],
  criticality: VendorCriticality,
  providerKey?: string | null
): number {
  const required = requiredEvidenceForVendor(criticality, providerKey);
  if (required.length === 0) return 100;

  const byType = new Map(
    evidence.map((e) => [e.evidence_type, normalizeEvidenceStatus(e.status)])
  );
  let sum = 0;
  for (const type of required) {
    sum += evidenceStatusPoints(byType.get(type) ?? "not_fulfilled");
  }
  return Math.round(sum / required.length);
}

export function calculateRiskLevel(input: {
  criticality: VendorCriticality;
  questionnaireScore: number;
  evidenceScore: number;
  answers: VendorQuestionnaireAnswers;
  providerKey?: string | null;
}): VendorRiskLevel {
  let risk = CRITICALITY_BASE_RISK[input.criticality];

  const floor = getProviderRiskFloor(input.providerKey);
  if (floor) {
    risk = riskMax(risk, floor);
  }

  if (input.evidenceScore < 50) {
    risk = riskMax(risk, "high");
  } else if (input.evidenceScore < 70) {
    risk = riskMax(risk, "medium");
  }

  if (input.questionnaireScore < 40) {
    risk = riskMax(risk, "high");
  }

  if (input.answers.security_incidents_12m === "yes") {
    risk = riskMax(risk, "high");
  }

  if (
    input.answers.processes_personal_data === "yes" &&
    input.evidenceScore < 60
  ) {
    risk = riskMax(risk, "critical");
  }

  return risk;
}

export function calculateVendorScore(
  questionnaireScore: number,
  evidenceScore: number
): number {
  return Math.round(questionnaireScore * 0.45 + evidenceScore * 0.55);
}

export function nextReviewDate(
  criticality: VendorCriticality,
  from = new Date()
): Date {
  const d = new Date(from);
  if (criticality === "critical" || criticality === "high") {
    d.setMonth(d.getMonth() + 6);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

export function isReviewDue(nextReviewAt: string | null): boolean {
  if (!nextReviewAt) return true;
  return new Date(nextReviewAt) <= new Date();
}

export function countMissingEvidence(
  evidence: VendorEvidence[],
  criticality: VendorCriticality,
  providerKey?: string | null
): number {
  const required = requiredEvidenceForVendor(criticality, providerKey);
  const byType = new Map(
    evidence.map((e) => [e.evidence_type, normalizeEvidenceStatus(e.status)])
  );
  return required.filter((t) => {
    const status = byType.get(t) ?? "not_fulfilled";
    return status === "not_fulfilled";
  }).length;
}

export function evaluateVendor(input: {
  criticality: VendorCriticality;
  evidence: VendorEvidence[];
  answers: VendorQuestionnaireAnswers;
  providerKey?: string | null;
}) {
  const questionnaireScore = scoreQuestionnaire(input.answers);
  const evidenceScore = scoreEvidence(
    input.evidence,
    input.criticality,
    input.providerKey
  );
  const riskLevel = calculateRiskLevel({
    criticality: input.criticality,
    questionnaireScore,
    evidenceScore,
    answers: input.answers,
    providerKey: input.providerKey,
  });
  const vendorScore = calculateVendorScore(questionnaireScore, evidenceScore);

  return {
    questionnaireScore,
    evidenceScore,
    riskLevel,
    vendorScore,
    processesPersonalData: input.answers.processes_personal_data === "yes",
  };
}
