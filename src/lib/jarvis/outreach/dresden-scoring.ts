import { DRESDEN_REGION_CITIES, DRESDEN_LEAD_POOL } from "@/lib/jarvis/outreach/dresden-leads";
import type { QualifiedLeadInput } from "@/lib/jarvis/outreach/qualified-lead-types";
import {
  QUALIFIED_DEFAULT_LEADS_PER_RUN,
  QUALIFIED_MAX_LEADS_PER_RUN,
} from "@/lib/jarvis/outreach/qualified-lead-types";
import {
  rankQualifiedLeads,
  scoreQualifiedLead,
} from "@/lib/jarvis/outreach/qualified-lead-scoring";

export { QUALIFIED_MIN_SCORE as DRESDEN_MIN_SCORE } from "@/lib/jarvis/outreach/qualified-lead-types";
export { QUALIFIED_MAX_LEADS_PER_RUN as DRESDEN_MAX_LEADS_PER_RUN } from "@/lib/jarvis/outreach/qualified-lead-types";
export { QUALIFIED_DEFAULT_LEADS_PER_RUN as DRESDEN_DEFAULT_LEADS_PER_RUN } from "@/lib/jarvis/outreach/qualified-lead-types";

export type DresdenRegionLead = QualifiedLeadInput;

const DRESDEN_OPTIONS = {
  allowedCities: DRESDEN_REGION_CITIES,
  scoreLabel: "Dresden-Score",
};

export function scoreDresdenLead(lead: QualifiedLeadInput) {
  return scoreQualifiedLead(lead, DRESDEN_OPTIONS);
}

export function rankDresdenLeads(pool: QualifiedLeadInput[] = DRESDEN_LEAD_POOL, limit = QUALIFIED_DEFAULT_LEADS_PER_RUN) {
  return rankQualifiedLeads(pool, limit, DRESDEN_OPTIONS);
}
