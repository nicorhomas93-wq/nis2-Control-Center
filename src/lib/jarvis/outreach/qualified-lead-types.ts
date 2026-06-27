/** Gemeinsames Lead-Format für regionale & bundesweite Discovery */

export interface QualifiedLeadInput {
  company_name: string;
  city: string;
  industry: string;
  employee_count: number;
  website?: string;
  contact_role?: string;
  hints?: string;
}

export interface QualifiedScoreResult {
  passed: boolean;
  score: number;
  relevance_reason: string;
  outreach_hook: string;
  rejection_reason?: string;
  breakdown: string[];
}

export const QUALIFIED_MIN_SCORE = 6;
export const QUALIFIED_MAX_LEADS_PER_RUN = 20;
export const QUALIFIED_DEFAULT_LEADS_PER_RUN = 15;
