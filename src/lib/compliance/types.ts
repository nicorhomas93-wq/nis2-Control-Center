export type CriticalityLevel = "low" | "medium" | "high" | "critical";

export type SecurityLevel = "stable" | "attention" | "critical";

export type ObligationStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "overdue"
  | "critically_overdue";

export interface ObligationFields {
  is_mandatory?: boolean;
  criticality?: CriticalityLevel | string | null;
  deadline?: string | null;
  escalation_level?: number | null;
  responsible?: string | null;
}

export interface ScoreDriver {
  id: string;
  label: string;
  impact: number;
  category: string;
}

export interface SecurityStatusResult {
  score: number;
  level: SecurityLevel;
  summary: string;
  drivers: ScoreDriver[];
  auditReadinessPercent: number;
}

export interface SecurityScoreSnapshot {
  recorded_at: string;
  score: number;
  level: SecurityLevel;
}

export interface NextStepAction {
  id: string;
  title: string;
  reason: string;
  priority: CriticalityLevel;
  deadline: string | null;
  href: string;
  sortScore: number;
}

export const SECURITY_LEVEL_LABELS: Record<SecurityLevel, string> = {
  stable: "Stabil",
  attention: "Handlungsbedarf",
  critical: "Kritisch",
};

export const OBLIGATION_STATUS_LABELS: Record<ObligationStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  completed: "Erledigt",
  overdue: "Überfällig",
  critically_overdue: "Kritisch überfällig",
};
