import { calculateSecurityStatus } from "@/lib/compliance/security-status";
import { buildNextSteps } from "@/lib/compliance/next-steps";
import type { NextStepAction, SecurityStatusResult } from "@/lib/compliance/types";
import type { TaskItem } from "@/lib/tasks/types";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";
import { calculateDataQuality } from "@/lib/compliance/data-quality";
import {
  buildOnboardingStepViews,
  filterNextStepsForOnboarding,
} from "@/lib/onboarding/evaluate";
import type { OnboardingDataInput } from "@/lib/onboarding/evaluate";
import type { CompanyAsset } from "@/lib/assets/types";
import type { VendorWithDetails } from "@/lib/vendors/types";
import type { ComplianceEvidenceEntryWithFiles } from "@/lib/compliance-evidence/types";

export interface ComplianceDataInput {
  company: Company | null;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  incidents: Incident[];
  tasks?: TaskItem[];
  assets?: CompanyAsset[];
  vendors?: VendorWithDetails[];
  complianceEvidence?: ComplianceEvidenceEntryWithFiles[];
  onboarding?: Pick<
    OnboardingDataInput,
    "evidenceCount" | "assessmentCount" | "auditExportCount" | "teamMemberCount"
  >;
}

export interface ComplianceSnapshot {
  securityStatus: SecurityStatusResult;
  nextSteps: NextStepAction[];
  dataQuality: ReturnType<typeof calculateDataQuality>;
}

/** Einheitliche Berechnung für Score, Audit-Bereitschaft und nächste Schritte. */
export function buildComplianceSnapshot(input: ComplianceDataInput): ComplianceSnapshot {
  const dataQuality = calculateDataQuality({
    company: input.company,
    risks: input.risks,
    measures: input.measures,
    documents: input.documents,
    tasks: input.tasks,
    vendors: input.vendors,
    complianceEvidence: input.complianceEvidence,
  });
  const securityStatus = calculateSecurityStatus({
    ...input,
    vendors: input.vendors,
    complianceEvidence: input.complianceEvidence,
  });
  let nextSteps = buildNextSteps(
    {
      company: input.company,
      documents: input.documents,
      measures: input.measures,
      risks: input.risks,
      incidents: input.incidents,
      tasks: input.tasks,
      assets: input.assets,
    },
    securityStatus
  );

  if (input.onboarding) {
    const onboardingSteps = buildOnboardingStepViews({
      company: input.company,
      documents: input.documents,
      measures: input.measures,
      risks: input.risks,
      assets: input.assets ?? [],
      evidenceCount: input.onboarding.evidenceCount,
      assessmentCount: input.onboarding.assessmentCount,
      auditExportCount: input.onboarding.auditExportCount,
      teamMemberCount: input.onboarding.teamMemberCount,
    });
    nextSteps = filterNextStepsForOnboarding(nextSteps, onboardingSteps);
  }

  return { securityStatus, nextSteps, dataQuality };
}
