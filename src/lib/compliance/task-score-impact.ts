import type { ScoreDriver } from "@/lib/compliance/types";
import type { TaskItem } from "@/lib/tasks/types";
import { isTaskOpen } from "@/lib/tasks/types";

export function applyTaskScoreImpact(
  score: number,
  tasks: TaskItem[],
  addDriver: (driver: ScoreDriver) => void
): number {
  const now = new Date();

  for (const task of tasks) {
    if (!isTaskOpen(task.status)) continue;

    const overdue =
      task.status === "overdue" ||
      (task.due_date && new Date(task.due_date) < now);

    if (overdue && task.priority === "critical") {
      const impact = 15;
      score -= impact;
      addDriver({
        id: `task-overdue-critical-${task.id}`,
        title: `Kritische überfällige Aufgabe: ${task.title}`,
        asset: "Aufgaben",
        severity: "Kritisch",
        impact,
        recommendation: "Aufgabe sofort bearbeiten und Nachweis hinterlegen",
        category: "tasks",
        label: task.title,
      });
    } else if (overdue && task.priority === "high") {
      const impact = 10;
      score -= impact;
      addDriver({
        id: `task-overdue-high-${task.id}`,
        title: `Überfällige Aufgabe: ${task.title}`,
        asset: "Aufgaben",
        severity: "Hoch",
        impact,
        recommendation: "Frist einhalten oder Verantwortlichen eskalieren",
        category: "tasks",
        label: task.title,
      });
    } else if (task.evidence_required && task.status === "waiting_evidence") {
      const impact = 5;
      score -= impact;
      addDriver({
        id: `task-evidence-${task.id}`,
        title: `Nachweis fehlt: ${task.title}`,
        asset: "Audit",
        severity: "Mittel",
        impact,
        recommendation: "Nachweis hochladen, um Aufgabe abzuschließen",
        category: "tasks",
        label: task.title,
      });
    } else if (
      task.evidence_required &&
      (task.task_type === "measure" || task.task_type === "audit")
    ) {
      const impact = 5;
      score -= impact;
      addDriver({
        id: `task-mandatory-${task.id}`,
        title: `Offene Pflichtaufgabe: ${task.title}`,
        asset: "Compliance",
        severity: "Mittel",
        impact,
        recommendation: "Aufgabe bearbeiten und dokumentieren",
        category: "tasks",
        label: task.title,
      });
    }
  }

  return score;
}

export function applyTaskAuditImpact(
  auditScore: number,
  tasks: TaskItem[],
  reasons: string[]
): number {
  for (const task of tasks) {
    if (!isTaskOpen(task.status)) continue;

    if (
      task.evidence_required &&
      (task.status === "waiting_evidence" ||
        (task.task_type === "evidence" || task.task_type === "audit"))
    ) {
      auditScore -= 10;
      reasons.push(`fehlender Nachweis: ${task.title}`);
    }

    if (task.priority === "critical" && task.status !== "completed") {
      auditScore -= 5;
      reasons.push(`kritische offene Aufgabe: ${task.title}`);
    }
  }

  return auditScore;
}

export function completedTasksWithEvidence(tasks: TaskItem[]): number {
  return tasks.filter((t) => t.status === "completed" && t.evidence_required).length;
}
