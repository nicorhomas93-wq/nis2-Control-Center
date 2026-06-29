import type { NextStepAction, SecurityStatusResult } from "@/lib/compliance/types";

export const COMPLIANCE_UPDATED_EVENT = "tknd:compliance-updated";

export interface ComplianceUpdatedDetail {
  companyId: string;
  securityStatus: SecurityStatusResult;
  nextSteps?: NextStepAction[];
  eventTitle?: string;
  scoreDelta?: number;
  feedbackMessage?: string;
}

export function emitComplianceUpdated(detail: ComplianceUpdatedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMPLIANCE_UPDATED_EVENT, { detail }));
}
