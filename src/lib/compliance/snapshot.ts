import { calculateSecurityStatus } from "@/lib/compliance/security-status";
import { buildNextSteps } from "@/lib/compliance/next-steps";
import type { NextStepAction, SecurityStatusResult } from "@/lib/compliance/types";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";

export interface ComplianceDataInput {
  company: Company | null;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  incidents: Incident[];
}

export interface ComplianceSnapshot {
  securityStatus: SecurityStatusResult;
  nextSteps: NextStepAction[];
}

/** Einheitliche Berechnung für Score, Audit-Bereitschaft und nächste Schritte. */
export function buildComplianceSnapshot(input: ComplianceDataInput): ComplianceSnapshot {
  const securityStatus = calculateSecurityStatus(input);
  const nextSteps = buildNextSteps(
    {
      documents: input.documents,
      measures: input.measures,
      risks: input.risks,
      incidents: input.incidents,
    },
    securityStatus
  );

  return { securityStatus, nextSteps };
}
