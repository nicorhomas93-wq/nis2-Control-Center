export type QuestionnaireArea =
  | "backup"
  | "access_control"
  | "training"
  | "incident_response"
  | "suppliers"
  | "patch_management"
  | "emergency"
  | "document_reviews";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionnaireQuestion {
  id: string;
  text: string;
  type: "yes_no_unknown" | "text" | "select";
  options?: QuestionOption[];
  showIf?: { questionId: string; values: string[] };
  followUps?: QuestionnaireQuestion[];
}

export interface QuestionnaireDefinition {
  areaKey: QuestionnaireArea;
  title: string;
  questions: QuestionnaireQuestion[];
}

export const QUESTIONNAIRES: QuestionnaireDefinition[] = [
  {
    areaKey: "backup",
    title: "Backup",
    questions: [
      {
        id: "backup_exists",
        text: "Existiert ein Backup-Konzept?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
        followUps: [
          {
            id: "backup_frequency",
            text: "Wie häufig werden Backups erstellt?",
            type: "text",
            showIf: { questionId: "backup_exists", values: ["yes"] },
          },
          {
            id: "backup_location",
            text: "Wo werden Backups gespeichert?",
            type: "text",
            showIf: { questionId: "backup_exists", values: ["yes"] },
          },
          {
            id: "backup_restore_test",
            text: "Wann wurde zuletzt eine Wiederherstellung getestet?",
            type: "text",
            showIf: { questionId: "backup_exists", values: ["yes"] },
          },
          {
            id: "backup_evidence",
            text: "Gibt es einen Nachweis?",
            type: "yes_no_unknown",
            options: [
              { value: "yes", label: "Ja" },
              { value: "no", label: "Nein" },
              { value: "unknown", label: "Unbekannt" },
            ],
            showIf: { questionId: "backup_exists", values: ["yes"] },
          },
        ],
      },
    ],
  },
  {
    areaKey: "access_control",
    title: "Zugriffskontrolle",
    questions: [
      {
        id: "access_policy",
        text: "Existiert eine Zugriffskontroll-Richtlinie?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
      },
      {
        id: "mfa_enabled",
        text: "Ist MFA für kritische Systeme aktiv?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
      },
    ],
  },
  {
    areaKey: "training",
    title: "Schulungen",
    questions: [
      {
        id: "security_training",
        text: "Werden regelmäßige Sicherheitsschulungen durchgeführt?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
      },
    ],
  },
  {
    areaKey: "incident_response",
    title: "Incident Response",
    questions: [
      {
        id: "ir_plan",
        text: "Existiert ein Incident-Response-Plan?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
      },
    ],
  },
  {
    areaKey: "suppliers",
    title: "Lieferanten",
    questions: [
      {
        id: "supplier_assessment",
        text: "Werden Lieferanten auf IT-Sicherheit geprüft?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
      },
    ],
  },
  {
    areaKey: "patch_management",
    title: "Patchmanagement",
    questions: [
      {
        id: "patch_process",
        text: "Existiert ein dokumentiertes Patchmanagement?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
      },
    ],
  },
  {
    areaKey: "emergency",
    title: "Notfallmanagement",
    questions: [
      {
        id: "bcp_exists",
        text: "Existiert ein Notfall- / Wiederanlaufplan?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
      },
    ],
  },
  {
    areaKey: "document_reviews",
    title: "Dokumentenreviews",
    questions: [
      {
        id: "doc_review_cycle",
        text: "Werden Pflichtdokumente regelmäßig geprüft?",
        type: "yes_no_unknown",
        options: [
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Unbekannt" },
        ],
      },
    ],
  },
];

export function evaluateBackupAnswers(answers: Record<string, string>): {
  riskLevel: "medium" | "high";
  taskTitle?: string;
} | null {
  if (answers.backup_exists !== "yes") return null;
  if (!answers.backup_restore_test || answers.backup_restore_test.trim() === "") {
    return {
      riskLevel: "high",
      taskTitle: "Backup-Wiederherstellungstest durchführen und dokumentieren",
    };
  }
  if (answers.backup_evidence === "no") {
    return { riskLevel: "medium", taskTitle: "Backup-Nachweis hochladen" };
  }
  return null;
}

export function getQuestionnaire(areaKey: QuestionnaireArea): QuestionnaireDefinition | undefined {
  return QUESTIONNAIRES.find((q) => q.areaKey === areaKey);
}

export interface QuestionnaireTaskSpec {
  taskTitle: string;
  description?: string;
  taskType?: import("@/lib/tasks/types").TaskType;
  priority?: import("@/lib/tasks/types").TaskPriority;
  evidenceRequired?: boolean;
}

export function flattenQuestions(
  questions: QuestionnaireQuestion[],
  answers: Record<string, string>
): QuestionnaireQuestion[] {
  const result: QuestionnaireQuestion[] = [];
  for (const q of questions) {
    if (q.showIf && !q.showIf.values.includes(answers[q.showIf.questionId] ?? "")) {
      continue;
    }
    result.push(q);
    if (q.followUps?.length) {
      result.push(...flattenQuestions(q.followUps, answers));
    }
  }
  return result;
}

export function evaluateQuestionnaireTasks(
  areaKey: QuestionnaireArea,
  answers: Record<string, string>
): QuestionnaireTaskSpec[] {
  const tasks: QuestionnaireTaskSpec[] = [];

  if (areaKey === "backup") {
    const evalResult = evaluateBackupAnswers(answers);
    if (evalResult?.taskTitle) {
      tasks.push({
        taskTitle: evalResult.taskTitle,
        description: "Abgeleitet aus Backup-Fragebogen",
        taskType: "audit",
        priority: evalResult.riskLevel === "high" ? "high" : "medium",
        evidenceRequired: true,
      });
    }
    if (answers.backup_exists === "no") {
      tasks.push({
        taskTitle: "Backup-Konzept erstellen und dokumentieren",
        taskType: "document",
        priority: "high",
        evidenceRequired: true,
      });
    }
  }

  if (areaKey === "access_control") {
    if (answers.access_policy === "no") {
      tasks.push({
        taskTitle: "Zugriffskontroll-Richtlinie erstellen",
        taskType: "document",
        priority: "high",
        evidenceRequired: true,
      });
    }
    if (answers.mfa_enabled === "no") {
      tasks.push({
        taskTitle: "MFA für kritische Systeme einführen",
        taskType: "measure",
        priority: "high",
        evidenceRequired: true,
      });
    }
  }

  if (areaKey === "training" && answers.security_training === "no") {
    tasks.push({
      taskTitle: "Sicherheitsschulung planen und durchführen",
      taskType: "training",
      priority: "medium",
      evidenceRequired: true,
    });
  }

  if (areaKey === "incident_response" && answers.ir_plan === "no") {
    tasks.push({
      taskTitle: "Incident-Response-Plan dokumentieren",
      taskType: "document",
      priority: "critical",
      evidenceRequired: true,
    });
  }

  if (areaKey === "suppliers" && answers.supplier_assessment === "no") {
    tasks.push({
      taskTitle: "Lieferanten-Sicherheitsbewertung einführen",
      taskType: "audit",
      priority: "medium",
      evidenceRequired: true,
    });
  }

  if (areaKey === "patch_management" && answers.patch_process === "no") {
    tasks.push({
      taskTitle: "Patchmanagement-Prozess dokumentieren",
      taskType: "document",
      priority: "high",
      evidenceRequired: true,
    });
  }

  if (areaKey === "emergency" && answers.bcp_exists === "no") {
    tasks.push({
      taskTitle: "Notfall- / Wiederanlaufplan erstellen",
      taskType: "document",
      priority: "high",
      evidenceRequired: true,
    });
  }

  if (areaKey === "document_reviews" && answers.doc_review_cycle === "no") {
    tasks.push({
      taskTitle: "Dokumentenreview-Zyklus einführen",
      taskType: "audit",
      priority: "medium",
      evidenceRequired: true,
    });
  }

  return tasks;
}
