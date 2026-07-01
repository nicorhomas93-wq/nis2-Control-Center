export const TASK_TYPES = [
  "risk",
  "measure",
  "document",
  "evidence",
  "training",
  "incident",
  "audit",
  "general",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "open",
  "in_progress",
  "waiting_evidence",
  "completed",
  "overdue",
  "blocked",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  risk: "Risiko",
  measure: "Maßnahme",
  document: "Dokument",
  evidence: "Nachweis",
  training: "Schulung",
  incident: "Incident",
  audit: "Audit",
  general: "Allgemein",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  waiting_evidence: "Wartet auf Nachweis",
  completed: "Erledigt",
  overdue: "Überfällig",
  blocked: "Blockiert",
};

export interface TaskItem {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  evidence_required: boolean;
  completion_note: string | null;
  related_type: string | null;
  related_id: string | null;
  reminders_enabled: boolean;
  last_reminder_at: string | null;
  next_reminder_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type TaskFilter =
  | "mine"
  | "all"
  | "overdue"
  | "critical"
  | "waiting_evidence"
  | "completed";

export const OPEN_TASK_STATUSES: TaskStatus[] = [
  "open",
  "in_progress",
  "waiting_evidence",
  "overdue",
  "blocked",
];

export function isTaskOpen(status: TaskStatus): boolean {
  return OPEN_TASK_STATUSES.includes(status);
}

export function isTaskOverdue(task: Pick<TaskItem, "status" | "due_date">): boolean {
  if (!task.due_date || task.status === "completed") return false;
  return new Date(task.due_date) < new Date();
}
