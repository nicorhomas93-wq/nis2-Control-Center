/**
 * NIS2-Relevanz-Score (0–10) — ausschließlich Stammdaten.
 * Basis: Unternehmensgröße, Branche, Kritikalität/Infrastrukturrolle.
 * Keine Website-, Web-Präsenz- oder Erreichbarkeits-Signale.
 */

export type Nis2Priority = "high" | "medium" | "low";

export interface Nis2ScoreInput {
  company_name: string;
  industry?: string | null;
  employee_count?: string | number | null;
  /** Optionale Hinweise — nur für Branchen-Matching, nicht für Web-Signale */
  hints?: string | null;
}

export interface Nis2ScoreResult {
  score: number;
  /** Wie belastbar die Stammdaten für diesen Score sind (0–100 %) */
  score_data_confidence: number;
  priority: Nis2Priority;
  breakdown: string[];
  data_flags: string[];
  nis2_likelihood: "yes" | "no" | "uncertain";
}

interface IndustryRule {
  label: string;
  bonus: number;
  keywords: string[];
}

const INDUSTRY_RULES: IndustryRule[] = [
  {
    label: "Kritische Infrastruktur",
    bonus: 3,
    keywords: [
      "kritische infrastruktur",
      "kritis",
      "energieversorgung",
      "wasserversorgung",
      "verkehr",
      "critical infrastructure",
    ],
  },
  {
    label: "Energie / Gesundheit / Pharma",
    bonus: 3,
    keywords: [
      "energie",
      "strom",
      "gas",
      "netzbetrieb",
      "gesundheit",
      "krankenhaus",
      "pflege",
      "pharma",
      "medizintechnik",
      "klinik",
      "healthcare",
    ],
  },
  {
    label: "Industrie / Produktion",
    bonus: 2,
    keywords: [
      "industrie",
      "produktion",
      "fertigung",
      "maschinenbau",
      "manufacturing",
      "werk",
      "chemie",
      "automotive",
    ],
  },
  {
    label: "Logistik / Transport",
    bonus: 2,
    keywords: [
      "logistik",
      "transport",
      "spedition",
      "supply chain",
      "fracht",
      "kurier",
    ],
  },
  {
    label: "IT / Hosting / Software",
    bonus: 2,
    keywords: [
      "it-dienstleist",
      "software",
      "hosting",
      "cloud",
      "systemhaus",
      "msp",
      "ict",
      "telekommunikation",
      "saas",
      "rechenzentrum",
      "datacenter",
    ],
  },
];

const LOW_RELEVANCE_KEYWORDS = [
  "friseur",
  "einzelhandel",
  "boutique",
  "gastronomie",
  "café",
  "bäckerei",
  "handwerk",
  "kleinstunternehmen",
];

export function parseEmployeeCount(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const match = String(value).replace(/\./g, "").match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export function calculateNis2RelevanceScore(input: Nis2ScoreInput): Nis2ScoreResult {
  const breakdown: string[] = [];
  const data_flags: string[] = [];
  let score = 0;
  let scoreDataConfidence = 100;

  const stammdatenText = [input.company_name, input.industry ?? "", input.hints ?? ""]
    .join(" ")
    .toLowerCase();

  const employees = parseEmployeeCount(input.employee_count);

  if (employees != null && employees >= 250) {
    score += 4;
    breakdown.push(`Unternehmensgröße: ${employees} MA → sehr hohe NIS2-Relevanz (+4)`);
  } else if (employees != null && employees >= 50) {
    score += 2;
    breakdown.push(`Unternehmensgröße: ${employees} MA → erhöhte NIS2-Relevanz (+2)`);
  } else if (employees != null && employees > 0) {
    score += 1;
    breakdown.push(`Unternehmensgröße: ${employees} MA → unter 50 MA (+1)`);
  } else {
    scoreDataConfidence -= 15;
    data_flags.push("Mitarbeiterzahl unbekannt");
    breakdown.push("Mitarbeiterzahl unbekannt — Score nur aus Branche");
  }

  let bestIndustry: IndustryRule | null = null;
  for (const rule of INDUSTRY_RULES) {
    const industryText = (input.industry ?? "").toLowerCase();
    const matched =
      rule.keywords.some((kw) => industryText.includes(kw)) ||
      rule.keywords.some((kw) => stammdatenText.includes(kw));
    if (matched && (!bestIndustry || rule.bonus > bestIndustry.bonus)) {
      bestIndustry = rule;
    }
  }

  if (bestIndustry) {
    score += bestIndustry.bonus;
    breakdown.push(`Branche/Kritikalität: ${bestIndustry.label} (+${bestIndustry.bonus})`);
  } else if (input.industry) {
    breakdown.push(`Branche „${input.industry}“ ohne erhöhte NIS2-Einordnung`);
  } else {
    scoreDataConfidence -= 15;
    data_flags.push("Branche unbekannt");
    breakdown.push("Branche unbekannt — Score eingeschränkt");
  }

  for (const kw of LOW_RELEVANCE_KEYWORDS) {
    if (stammdatenText.includes(kw)) {
      score -= 2;
      breakdown.push(`Geringe Branchenrelevanz (${kw}, −2)`);
      break;
    }
  }

  score = Math.max(0, Math.min(10, score));
  scoreDataConfidence = Math.max(0, Math.min(100, scoreDataConfidence));

  const priority: Nis2Priority =
    score >= 7 ? "high" : score >= 4 ? "medium" : "low";

  const nis2_likelihood: Nis2ScoreResult["nis2_likelihood"] =
    score >= 7 ? "yes" : score <= 3 ? "no" : "uncertain";

  breakdown.unshift(
    `NIS2-Relevanz: ${score}/10 (${priorityLabel(priority)}) · Stammdaten: ${scoreDataConfidence}%`
  );

  return {
    score,
    score_data_confidence: scoreDataConfidence,
    priority,
    breakdown,
    data_flags,
    nis2_likelihood,
  };
}

/** @deprecated Nutze score_data_confidence */
export function nis2ScoreConfidence(result: Nis2ScoreResult): number {
  return result.score_data_confidence;
}

export function priorityLabel(priority: Nis2Priority): string {
  switch (priority) {
    case "high":
      return "Hohe Priorität";
    case "medium":
      return "Mittlere Priorität";
    case "low":
      return "Niedrige Priorität";
  }
}

export function scoreBadgeClass(score: number): string {
  if (score >= 7) return "bg-red-100 text-red-800";
  if (score >= 4) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 85) return "bg-emerald-50 text-emerald-800";
  if (confidence >= 70) return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
}
