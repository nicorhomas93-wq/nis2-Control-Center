import type { CriticalityLevel, ObligationStatus, ObligationFields } from "@/lib/compliance/types";

export function normalizeCriticality(value: string | null | undefined): CriticalityLevel {
  if (value === "critical" || value === "high" || value === "low") return value;
  return "medium";
}

export function isWorkComplete(status: string): boolean {
  return (
    status === "completed" ||
    status === "resolved" ||
    status === "closed"
  );
}

export function isInProgress(status: string): boolean {
  return (
    status === "in_progress" ||
    status === "investigating" ||
    status === "waiting_feedback" ||
    status === "documentation_open"
  );
}

export function resolveObligationStatus(input: {
  status: string;
  deadline?: string | null;
  criticality?: string | null;
  isMandatory?: boolean;
}): ObligationStatus {
  if (isWorkComplete(input.status)) return "completed";

  const deadline = input.deadline ? new Date(input.deadline) : null;
  const now = new Date();

  if (deadline && deadline < now) {
    const crit = normalizeCriticality(input.criticality);
    if (crit === "critical" || (input.isMandatory && crit === "high")) {
      return "critically_overdue";
    }
    return "overdue";
  }

  if (isInProgress(input.status)) return "in_progress";
  return "open";
}

export function daysOverdue(deadline: string | null | undefined): number {
  if (!deadline) return 0;
  const diff = Date.now() - new Date(deadline).getTime();
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
}

export function obligationFieldsFromRow(row: ObligationFields & { responsible?: string | null }) {
  return {
    is_mandatory: Boolean(row.is_mandatory),
    criticality: normalizeCriticality(row.criticality ?? "medium"),
    deadline: row.deadline ?? null,
    escalation_level: row.escalation_level ?? 0,
    responsible: row.responsible ?? null,
  };
}
