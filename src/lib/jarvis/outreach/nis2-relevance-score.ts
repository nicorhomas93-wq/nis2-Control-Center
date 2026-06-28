/**
 * NIS2-Relevanz-Score (0–10) für B2B-Lead-Priorisierung.
 * Risiko-Score basiert auf Stammdaten (Größe, Branche) — nicht auf fehlenden Websites.
 * Bewertungssicherheit (Confidence) separat, 0–100 %.
 */

import type { WebsiteDataStatus } from "@/lib/jarvis/outreach/assessment-quality";

export type Nis2Priority = "high" | "medium" | "low";

export interface Nis2ScoreInput {
  company_name: string;
  industry?: string | null;
  employee_count?: string | number | null;
  /** Nur auslesen, wenn website_data_status === "available" */
  website_text?: string | null;
  hints?: string | null;
  website_data_status?: WebsiteDataStatus;
}

export interface Nis2ScoreResult {
  /** NIS2-Relevanz / Priorisierung (0–10) — kein Website-Strafpunkt bei fehlenden Daten */
  score: number;
  /** Bewertungssicherheit (0–100 %) — sinkt bei Informationslücken */
  confidence_percent: number;
  priority: Nis2Priority;
  breakdown: string[];
  assessment_flags: string[];
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

const SIGNAL_KEYWORDS = [
  "nis2",
  "cyber",
  "compliance",
  "iso 27001",
  "informationssicherheit",
  "it-sicherheit",
  "microsoft 365",
  "cloud",
];

export function parseEmployeeCount(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const match = String(value).replace(/\./g, "").match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export function calculateNis2RelevanceScore(input: Nis2ScoreInput): Nis2ScoreResult {
  const breakdown: string[] = [];
  const assessment_flags: string[] = [];
  let score = 0;
  let confidence = 100;

  const websiteStatus = input.website_data_status ?? "none";
  const websiteAvailable = websiteStatus === "available";

  const stammdatenText = [input.company_name, input.industry ?? "", input.hints ?? ""]
    .join(" ")
    .toLowerCase();

  const websiteText = websiteAvailable ? (input.website_text ?? "").toLowerCase() : "";

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
    confidence -= 5;
    assessment_flags.push("Mitarbeiterzahl unbekannt");
    breakdown.push("Mitarbeiterzahl unbekannt — Relevanz nur aus Branche ableitbar");
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
    breakdown.push(`Branche: ${bestIndustry.label} (+${bestIndustry.bonus})`);
  } else if (input.industry) {
    breakdown.push(`Branche „${input.industry}“ ohne erhöhte NIS2-Einordnung`);
  } else {
    confidence -= 5;
    assessment_flags.push("Branche unbekannt");
    breakdown.push("Branche unbekannt — Einordnung eingeschränkt");
  }

  if (websiteStatus === "none") {
    confidence -= 10;
    assessment_flags.push("Informationslücke");
    breakdown.push(
      "Keine Website hinterlegt → reduzierte externe Bewertbarkeit (kein Compliance-Abzug)"
    );
  } else if (websiteStatus === "pending") {
    confidence -= 5;
    breakdown.push(
      "Website hinterlegt, aber noch nicht geprüft → externe Einordnung ausstehend (kein Compliance-Abzug)"
    );
  } else if (websiteStatus === "unreachable") {
    confidence -= 10;
    assessment_flags.push("Informationslücke");
    breakdown.push(
      "Website nicht verifizierbar → externe Angriffsfläche nicht bewertbar (kein Compliance-Abzug)"
    );
  } else {
    let signalHits = 0;
    for (const kw of SIGNAL_KEYWORDS) {
      if (websiteText.includes(kw)) signalHits += 1;
    }
    if (signalHits >= 2) {
      score += 2;
      breakdown.push("Öffentliche Website: mehrere IT-/Compliance-Hinweise (+2)");
    } else if (signalHits === 1) {
      score += 1;
      breakdown.push("Öffentliche Website: ein IT-/Compliance-Hinweis (+1)");
    } else {
      breakdown.push(
        "Öffentliche Website: keine erkennbaren Security-Hinweise (Beobachtung, kein NIS2-Abzug)"
      );
    }
  }

  for (const kw of LOW_RELEVANCE_KEYWORDS) {
    if (stammdatenText.includes(kw)) {
      score -= 2;
      breakdown.push(`Geringe Branchenrelevanz (${kw}, −2)`);
      break;
    }
  }

  score = Math.max(0, Math.min(10, score));
  confidence = Math.max(0, Math.min(100, confidence));

  const priority: Nis2Priority =
    score >= 7 ? "high" : score >= 4 ? "medium" : "low";

  const nis2_likelihood: Nis2ScoreResult["nis2_likelihood"] =
    score >= 7 ? "yes" : score <= 3 ? "no" : "uncertain";

  breakdown.unshift(
    `NIS2-Relevanz: ${score}/10 (${priorityLabel(priority)}) · Bewertungssicherheit: ${confidence}%`
  );

  return {
    score,
    confidence_percent: confidence,
    priority,
    breakdown,
    assessment_flags,
    nis2_likelihood,
  };
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
