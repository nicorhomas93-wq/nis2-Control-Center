import { hasConcreteDemandSignal } from "@/lib/jarvis/lead-research/quality-filter";
import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

/** Strenger Filter: nur konkrete Bedarfssignale, keine allgemeinen News-Treffer. */
export function matchesAutomatedResearchText(
  text: string,
  signalType: ResearchSignalType = "tender"
): boolean {
  const n = normalize(text);

  const strongPatterns = [
    /\bnis2\b/,
    /informationssicherheit/,
    /iso\s*27001/,
    /\bisms\b/,
    /cyber\s*security/,
    /cybersecurity/,
    /bsi\s*(it-)?grundschutz/,
    /informationssicherheitsbeauftragter/,
    /\bisb\b/,
    /it\s*security\s*manager/,
    /security\s*manager/,
    /compliance\s*manager/,
    /\bciso\b/,
    /isms\s*manager/,
    /incident\s*response/,
    /security\s*awareness/,
    /notfallmanagement/,
    /lieferantensicherheit/,
  ];

  if (!strongPatterns.some((pattern) => pattern.test(n))) {
    if (/risikomanagement/.test(n) && /informationssicherheit|cyber|nis2|iso\s*27001/.test(n)) {
      // ok
    } else {
      return false;
    }
  }

  return hasConcreteDemandSignal(text, signalType);
}
