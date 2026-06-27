import type { QualifiedLeadInput, QualifiedScoreResult } from "@/lib/jarvis/outreach/qualified-lead-types";
import { QUALIFIED_MIN_SCORE } from "@/lib/jarvis/outreach/qualified-lead-types";
import { buildOutreachHook as buildHookFromEngine } from "@/lib/jarvis/outreach/prompt-engine";

const HIGH_PRIORITY = [
  { label: "Industrie / Produktion", keywords: ["industrie", "produktion", "fertigung", "werk", "stahl"] },
  { label: "Energie / Versorgung", keywords: ["energie", "versorgung", "netz", "netzbetrieb", "strom", "gas", "utilities"] },
  { label: "Logistik / Transport", keywords: ["logistik", "transport", "spedition", "fracht", "supply chain"] },
  { label: "IT / Hosting / Systemhaus", keywords: ["it", "software", "hosting", "systemhaus", "cloud", "msp", "rechenzentrum", "saas"] },
  { label: "Gesundheitswesen", keywords: ["gesundheit", "klinik", "krankenhaus", "medizin", "pflege"] },
  { label: "Pharma / Chemie", keywords: ["pharma", "chemie", "labor", "biotech", "pharmazeut"] },
];

const MEDIUM_PRIORITY = [
  { label: "Maschinenbau", keywords: ["maschinenbau", "anlagenbau"] },
  { label: "Elektrotechnik", keywords: ["elektrotechnik", "elektronik", "halbleiter", "automotive"] },
  { label: "Technische Dienstleister", keywords: ["technische dienst", "ingenieur", "planung", "automatisierung"] },
];

const LOW_PRIORITY = ["einzelhandel", "bau", "gastronomie", "handwerk", "friseur", "boutique", "immobilien", "shop"];

const EXCLUSION_KEYWORDS = [
  "freelancer",
  "freiberuf",
  "online-shop",
  "online shop",
  "einzelunternehmen",
  "sole proprietor",
  "bäckerei",
  "café",
  "mini-betrieb",
];

const DIGITAL_SIGNALS = [
  "cloud",
  "microsoft 365",
  "m365",
  "erp",
  "digital",
  "software",
  "hosting",
  "ot/",
  "scada",
  "plattform",
  "produktion",
  "datacenter",
  "rechenzentrum",
];

const SECURITY_SIGNALS = ["nis2", "it-sicherheit", "informationssicherheit", "security", "compliance", "isms", "ciso"];

const CERT_SIGNALS = ["iso 27001", "iso27001", "iso 9001", "zertifizier", "tüv", "audit zertifikat"];

const COMPLEX_ORG_SIGNALS = [
  "konzern",
  "holding",
  "gruppe",
  "mehrere standorte",
  "international",
  "tochter",
  "verbund",
  "standorte deutschland",
];

export interface ScoreQualifiedLeadOptions {
  minScore?: number;
  /** Nur diese Städte erlauben (z. B. Dresden-Umland). null = ganz Deutschland */
  allowedCities?: Set<string> | null;
  scoreLabel?: string;
}

export function scoreQualifiedLead(
  lead: QualifiedLeadInput,
  options: ScoreQualifiedLeadOptions = {}
): QualifiedScoreResult {
  const minScore = options.minScore ?? QUALIFIED_MIN_SCORE;
  const breakdown: string[] = [];
  const text = [lead.company_name, lead.industry, lead.city, lead.hints ?? ""].join(" ").toLowerCase();

  if (options.allowedCities) {
    const cityOk = options.allowedCities.has(lead.city.trim().toLowerCase());
    if (!cityOk) {
      return reject(`Standort „${lead.city}“ außerhalb der Zielregion`);
    }
    breakdown.push(`Standort: ${lead.city} ✓`);
  } else {
    breakdown.push(`Standort: ${lead.city}, Deutschland ✓`);
  }

  if (lead.employee_count < 30) {
    return reject(`Zu klein (${lead.employee_count} MA)`);
  }
  if (lead.employee_count < 50) {
    return reject(`Unter Minimum (${lead.employee_count} MA, min. 50)`);
  }

  for (const kw of EXCLUSION_KEYWORDS) {
    if (text.includes(kw)) return reject(`Ausschluss: ${kw}`);
  }

  const industryLower = lead.industry.toLowerCase();
  for (const low of LOW_PRIORITY) {
    if (industryLower.includes(low)) {
      return reject(`Niedrig priorisierte Branche: ${lead.industry}`);
    }
  }

  if (industryLower.includes("gesundheit") && lead.employee_count < 80) {
    return reject("Gesundheitswesen: nur größere Einrichtungen (≥80 MA)");
  }

  let score = 0;
  let industryLabel = lead.industry;

  const highMatch = HIGH_PRIORITY.find((h) => h.keywords.some((kw) => industryLower.includes(kw)));
  const mediumMatch = MEDIUM_PRIORITY.find((m) => m.keywords.some((kw) => industryLower.includes(kw)));

  if (highMatch) {
    score += 3;
    industryLabel = highMatch.label;
    breakdown.push(`${highMatch.label} / kritische Relevanz (+3)`);
  } else if (mediumMatch) {
    score += 2;
    industryLabel = mediumMatch.label;
    breakdown.push(`${mediumMatch.label} (+2)`);
  } else {
    return reject(`Keine priorisierte Branche: ${lead.industry}`);
  }

  if (lead.employee_count > 100) {
    score += 2;
    breakdown.push(`>100 Mitarbeiter (${lead.employee_count} MA) (+2)`);
  }
  if (lead.employee_count > 250) {
    score += 1;
    breakdown.push(`>250 Mitarbeiter — sehr hohe Relevanz (+1)`);
  }

  const hasDigital =
    DIGITAL_SIGNALS.some((s) => text.includes(s)) ||
    industryLower.includes("it") ||
    industryLower.includes("software") ||
    industryLower.includes("hosting");
  if (hasDigital) {
    score += 2;
    breakdown.push("Hohe IT-/Digital-Abhängigkeit (+2)");
  }

  const hasSecurity = SECURITY_SIGNALS.some((s) => text.includes(s));
  if (!hasSecurity) {
    score += 1;
    breakdown.push("Keine Security-Hinweise (+1)");
  }

  const hasCert = CERT_SIGNALS.some((s) => text.includes(s));
  if (!hasCert) {
    score += 1;
    breakdown.push("Keine Zertifizierung (ISO etc.) sichtbar (+1)");
  }

  const hasComplexOrg = COMPLEX_ORG_SIGNALS.some((s) => text.includes(s)) || lead.employee_count > 200;
  if (hasComplexOrg) {
    score += 1;
    breakdown.push("Komplexe Organisation / Skalierung (+1)");
  }

  if (lead.employee_count >= 80 && lead.employee_count <= 500) {
    breakdown.push(`Ideale Größe: ${lead.employee_count} MA (80–500)`);
  }

  score = Math.min(10, score);

  const relevance_reason = buildRelevanceReason(lead, industryLabel, hasDigital, hasSecurity, score);
  const outreach_hook = buildHookFromEngine({
    company_name: lead.company_name,
    industry: industryLabel,
    employee_count: lead.employee_count,
    hasSecurity: hasSecurity,
  });

  if (score < minScore) {
    return {
      passed: false,
      score,
      relevance_reason,
      outreach_hook,
      rejection_reason: `Score ${score} unter Minimum (${minScore})`,
      breakdown,
    };
  }

  const label = options.scoreLabel ?? "Qualifiziert";
  breakdown.unshift(`${label}: ${score}/10 — Score ≥ ${minScore} ✓`);

  return { passed: true, score, relevance_reason, outreach_hook, breakdown };
}

function reject(reason: string): QualifiedScoreResult {
  return {
    passed: false,
    score: 0,
    relevance_reason: "",
    outreach_hook: "",
    rejection_reason: reason,
    breakdown: [reason],
  };
}

function buildRelevanceReason(
  lead: QualifiedLeadInput,
  industryLabel: string,
  hasDigital: boolean,
  hasSecurity: boolean,
  score: number
): string {
  const parts = [
    `${lead.company_name} (${lead.city}): ${industryLabel}, ${lead.employee_count} MA`,
  ];
  if (lead.employee_count > 100) parts.push("NIS2-relevante Größe");
  if (hasDigital) parts.push("IT-abhängig");
  if (!hasSecurity) parts.push("Security-Lücke erkennbar");
  parts.push(`Score ${score}/10`);
  return parts.join(" · ");
}

export function rankQualifiedLeads(
  pool: QualifiedLeadInput[],
  limit: number,
  options?: ScoreQualifiedLeadOptions
): Array<QualifiedLeadInput & QualifiedScoreResult> {
  const capped = Math.min(Math.max(limit, 1), 20);
  return pool
    .map((lead) => ({ ...lead, ...scoreQualifiedLead(lead, options) }))
    .filter((l) => l.passed)
    .sort((a, b) => b.score - a.score || b.employee_count - a.employee_count)
    .slice(0, capped);
}
