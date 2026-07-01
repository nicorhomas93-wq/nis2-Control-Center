import { getDocumentForFolder, AUDIT_FOLDERS } from "@/lib/audit/audit-folders";
import { isCompanyProfileComplete } from "@/lib/company";
import { isPlaceholderValue } from "@/lib/compliance/risk-display";
import type { CompanyAsset } from "@/lib/assets/types";
import type { Company, Document, Measure, Risk } from "@/lib/types";
import {
  ONBOARDING_STEPS,
  type OnboardingProgressRow,
  type OnboardingStepKey,
  type OnboardingStepStatus,
} from "@/lib/onboarding/steps";

export interface OnboardingDataInput {
  company: Company | null;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  assets: CompanyAsset[];
  evidenceCount: number;
  assessmentCount: number;
  auditExportCount: number;
  teamMemberCount: number;
}

export interface OnboardingStepView {
  key: OnboardingStepKey;
  label: string;
  href: string;
  status: OnboardingStepStatus;
  autoCompleted: boolean;
  completedAt: string | null;
}

function hasResponsiblePerson(input: OnboardingDataInput): boolean {
  if (input.company?.security_contact_name?.trim()) return true;
  if (input.teamMemberCount > 1) return true;

  for (const risk of input.risks) {
    if (!isPlaceholderValue(risk.responsible)) return true;
  }
  for (const measure of input.measures) {
    if (measure.responsible?.trim()) return true;
  }
  return false;
}

function hasMandatoryDocuments(documents: Document[]): boolean {
  return AUDIT_FOLDERS.some((folder) =>
    Boolean(getDocumentForFolder(documents, folder.documentType))
  );
}

function hasUploadedEvidence(input: OnboardingDataInput): boolean {
  if (input.evidenceCount >= 1) return true;
  return input.documents.some((doc) =>
    AUDIT_FOLDERS.some((folder) => folder.documentType === doc.document_type)
  );
}

function hasAuditData(input: OnboardingDataInput): boolean {
  if (input.auditExportCount > 0) return true;
  return hasMandatoryDocuments(input.documents);
}

const STEP_EVALUATORS: Record<
  OnboardingStepKey,
  (input: OnboardingDataInput) => boolean
> = {
  company_profile: (input) => isCompanyProfileComplete(input.company),
  assessment: (input) =>
    Boolean(
      input.company?.nis2_status && input.company.nis2_status !== "unbekannt"
    ) || input.assessmentCount > 0,
  assets: (input) => input.assets.length >= 1,
  risk_analysis: (input) => input.risks.length >= 1,
  responsibles: (input) => hasResponsiblePerson(input),
  documents: (input) => hasMandatoryDocuments(input.documents),
  measures: (input) => input.measures.length >= 1,
  evidence: (input) => hasUploadedEvidence(input),
  audit_folder: (input) => hasAuditData(input),
  dashboard_complete: () => false,
};

export function evaluateOnboardingStep(
  key: OnboardingStepKey,
  input: OnboardingDataInput,
  priorSteps: OnboardingStepView[]
): boolean {
  if (key === "dashboard_complete") {
    const required = ONBOARDING_STEPS.filter((s) => s.key !== "dashboard_complete");
    return required.every((step) => {
      const view = priorSteps.find((p) => p.key === step.key);
      return view?.status === "completed";
    });
  }
  return STEP_EVALUATORS[key](input);
}

export function buildOnboardingStepViews(
  input: OnboardingDataInput,
  storedRows: OnboardingProgressRow[] = []
): OnboardingStepView[] {
  const views: OnboardingStepView[] = [];

  for (const step of ONBOARDING_STEPS) {
    const row = storedRows.find((r) => r.step_key === step.key);
    const autoFulfilled = evaluateOnboardingStep(step.key, input, views);

    let status: OnboardingStepStatus = "pending";
    let autoCompleted = false;
    let completedAt = row?.completed_at ?? null;

    if (autoFulfilled) {
      status = "completed";
      autoCompleted = true;
      completedAt = completedAt ?? new Date().toISOString();
    } else if (row?.status === "skipped") {
      status = "skipped";
    } else if (row?.status === "completed") {
      status = "completed";
    } else if (row?.status === "in_progress") {
      status = "in_progress";
    }

    views.push({
      key: step.key,
      label: step.label,
      href: step.href,
      status,
      autoCompleted,
      completedAt,
    });
  }

  return views;
}

export function computeOnboardingPercentFromViews(
  steps: Pick<OnboardingStepView, "status" | "label">[]
): { percent: number; incomplete: string[]; completedCount: number } {
  const total = ONBOARDING_STEPS.length;
  let completedCount = 0;
  const incomplete: string[] = [];

  for (const step of steps) {
    if (step.status === "completed") {
      completedCount += 1;
    } else if (step.status === "skipped") {
      incomplete.push(step.label);
    }
  }

  return {
    percent: Math.round((completedCount / total) * 100),
    incomplete,
    completedCount,
  };
}

export function onboardingStepsToUpsert(
  companyId: string,
  steps: OnboardingStepView[]
): Array<{
  company_id: string;
  step_key: OnboardingStepKey;
  status: OnboardingStepStatus;
  completed_at: string | null;
  data_json: Record<string, unknown>;
}> {
  const now = new Date().toISOString();
  return steps
    .filter((s) => s.autoCompleted && s.status === "completed")
    .map((s) => ({
      company_id: companyId,
      step_key: s.key,
      status: "completed" as const,
      completed_at: s.completedAt ?? now,
      data_json: { auto: true, evaluated_at: now },
    }));
}


export function filterNextStepsForOnboarding<T extends { href: string; id: string }>(
  actions: T[],
  steps: OnboardingStepView[]
): T[] {
  const completed = new Set(
    steps.filter((s) => s.status === "completed").map((s) => s.key)
  );

  return actions.filter((action) => {
    if (action.id.startsWith("onboarding-")) return false;

    const href = action.href.split("?")[0];
    if (completed.has("assessment") && href === "/assessment") return false;
    if (completed.has("company_profile") && href === "/company") return false;
    if (completed.has("risk_analysis") && href === "/risks" && action.id === "onboarding-risks") {
      return false;
    }

    return true;
  });
}
