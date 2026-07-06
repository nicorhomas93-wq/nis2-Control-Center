import {
  ANNOUNCEMENT_KEYWORDS,
  JOB_KEYWORDS,
  TENDER_KEYWORDS,
} from "@/lib/jarvis/lead-research/constants";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

/** Strenger Filter für automatische Ingestion — weniger Rauschen als manuelle Volltextsuche. */
export function matchesAutomatedResearchText(text: string): boolean {
  const n = normalize(text);

  const strongPatterns = [
    /\bnis2\b/,
    /informationssicherheit/,
    /iso\s*27001/,
    /\bisms\b/,
    /cyber\s*security/,
    /cybersecurity/,
    /bsi\s*grundschutz/,
    /informationssicherheitsbeauftragter/,
    /\bisb\b/,
    /it\s*security\s*manager/,
    /security\s*manager/,
    /compliance\s*manager/,
  ];

  if (strongPatterns.some((pattern) => pattern.test(n))) return true;

  if (/risikomanagement/.test(n) && /informationssicherheit|cyber|nis2|iso\s*27001/.test(n)) {
    return true;
  }

  return false;
}

export function pickMatchedKeywords(text: string): string[] {
  const n = normalize(text);
  const all = [...TENDER_KEYWORDS, ...JOB_KEYWORDS, ...ANNOUNCEMENT_KEYWORDS];
  const seen = new Set<string>();

  for (const keyword of all) {
    const kw = keyword.toLowerCase();
    if (kw === "isb") {
      if (/\bisb\b/.test(n)) seen.add(keyword);
      continue;
    }
    if (n.includes(kw)) seen.add(keyword);
  }

  return [...seen];
}
