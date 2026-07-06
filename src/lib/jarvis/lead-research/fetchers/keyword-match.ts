import { hasConcreteDemandSignal } from "@/lib/jarvis/lead-research/quality-filter";
import { isGenericNewsContent } from "@/lib/jarvis/lead-research/media-block";
import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

const ROLE_OR_PROJECT_PATTERNS = [
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
  /nis2[\s-]*(umsetzung|compliance)/,
  /isms[\s-]*aufbau/,
  /ot[\s-]*security/,
  /\bdora\b/,
  /business\s*continuity/,
  /it[\s-]*asset/,
  /it[\s-]*governance/,
  /vergabestelle/,
  /auftraggeber/,
];

/** Strenger Filter: NIS2 allein reicht nicht — Rollen- oder Projektbezug erforderlich. */
export function matchesAutomatedResearchText(
  text: string,
  signalType: ResearchSignalType = "tender"
): boolean {
  if (isGenericNewsContent(text)) return false;

  const n = normalize(text);

  const hasRoleOrProject = ROLE_OR_PROJECT_PATTERNS.some((pattern) => pattern.test(n));
  const hasNis2WithContext =
    /\bnis2\b/.test(n) &&
    /(compliance|umsetzung|dora|manager|consultant|architect|lead|officer|governance|asset|vergabe|ausschreibung)/.test(
      n
    );

  if (!hasRoleOrProject && !hasNis2WithContext) {
    if (/risikomanagement/.test(n) && /informationssicherheit|cyber|iso\s*27001/.test(n)) {
      // ok
    } else {
      return false;
    }
  }

  return hasConcreteDemandSignal(text, signalType);
}
