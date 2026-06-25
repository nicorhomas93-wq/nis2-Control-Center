import type { FunnelCheckAnswers, FunnelCheckResult, FunnelResultLevel } from "@/lib/funnel/types";

const PROBLEM_FRAME =
  "Sie sind voraussichtlich betroffen — aktuell fehlt jedoch die vollständige Nachweisstruktur.";

export function scoreFunnelCheck(answers: FunnelCheckAnswers): FunnelCheckResult {
  let score = 0;

  if (answers.companySize === "250+") score += 35;
  else if (answers.companySize === "50-249") score += 25;
  else score += 10;

  if (answers.criticalInfrastructure) score += 30;

  if (answers.itDependency === "hoch") score += 25;
  else if (answers.itDependency === "mittel") score += 15;
  else score += 5;

  const criticalIndustries: FunnelCheckAnswers["industry"][] = [
    "energie",
    "gesundheit",
    "it",
    "produktion",
  ];
  if (criticalIndustries.includes(answers.industry)) score += 20;

  const level: FunnelResultLevel =
    score >= 60 ? "high" : score >= 35 ? "partial" : "low";

  const label =
    level === "high"
      ? "Hohe Wahrscheinlichkeit betroffen"
      : level === "partial"
        ? "Teilweise betroffen"
        : "Geringe Relevanz";

  const summary =
    level === "high"
      ? PROBLEM_FRAME
      : level === "partial"
        ? "Eine Betroffenheit ist möglich — ohne klare Dokumentation bleibt Ihr Risiko hoch."
        : "Die unmittelbare Betroffenheit erscheint geringer — eine prüfbare Struktur fehlt oft dennoch.";

  const problemFrame =
    level === "high" || level === "partial" ? PROBLEM_FRAME : summary;

  return {
    level,
    score: Math.min(100, score),
    label,
    summary,
    problemFrame,
    answers,
    completedAt: new Date().toISOString(),
  };
}
