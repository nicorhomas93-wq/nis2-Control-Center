import { calculateSecurityStatus } from "@/lib/compliance/security-status";
import { buildNextSteps } from "@/lib/compliance/next-steps";
import type { NextStepAction, SecurityStatusResult } from "@/lib/compliance/types";
import type { TaskItem } from "@/lib/tasks/types";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";
import { calculateDataQuality } from "@/lib/compliance/data-quality";

export interface ComplianceDataInput {
  company: Company | null;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  incidents: Incident[];
  tasks?: TaskItem[];
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
  });
  const securityStatus = calculateSecurityStatus(input);
  const nextSteps = buildNextSteps(
    {
      documents: input.documents,
      measures: input.measures,
      risks: input.risks,
      incidents: input.incidents,
      tasks: input.tasks,
    },
    securityStatus
  );

  return { securityStatus, nextSteps, dataQuality };
}
