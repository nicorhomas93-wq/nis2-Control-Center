export type CompanySize = "1-49" | "50-249" | "250+";
export type Industry =
  | "produktion"
  | "handel"
  | "dienstleistung"
  | "gesundheit"
  | "energie"
  | "it"
  | "sonstige";
export type ItDependency = "hoch" | "mittel" | "niedrig";
export type FunnelResultLevel = "high" | "partial" | "low";

export interface FunnelCheckAnswers {
  companySize: CompanySize;
  industry: Industry;
  criticalInfrastructure: boolean;
  itDependency: ItDependency;
}

export interface FunnelCheckResult {
  level: FunnelResultLevel;
  score: number;
  label: string;
  summary: string;
  problemFrame: string;
  answers: FunnelCheckAnswers;
  completedAt: string;
}

export const FUNNEL_STORAGE_KEY = "tknd_nis2_funnel_result";
