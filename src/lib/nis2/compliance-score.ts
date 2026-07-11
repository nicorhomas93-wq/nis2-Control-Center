import type { Document, Measure, Company } from "@/lib/types";
import { getCompanyCriticalityScores } from "@/lib/nis2/criticality-assessment";

export function calculateComplianceScore(
  company: Company | null,
  documents: Document[],
  measures: Measure[]
): number {
  if (!company) return 0;

  let score = 0;
  const weights = { profile: 25, assessment: 20, documents: 30, measures: 25 };

  const profileFields = [
    company.company_name,
    company.industry,
    company.employee_count,
    company.security_contact_name,
    company.critical_business_processes,
  ];
  const filled = profileFields.filter(Boolean).length;
  let profileScore = Math.round((filled / profileFields.length) * weights.profile);

  const criticality = getCompanyCriticalityScores(company);
  if (criticality.level !== "unbekannt") {
    profileScore = Math.min(weights.profile, profileScore + 5);
  }

  score += profileScore;

  if (company.nis2_status && company.nis2_status !== "unbekannt") {
    score += weights.assessment;
  }

  score += Math.round(Math.min(documents.length / 5, 1) * weights.documents);

  if (measures.length > 0) {
    const completed = measures.filter((m) => m.status === "completed").length;
    score += Math.round((completed / measures.length) * weights.measures);
  }

  return Math.min(score, 100);
}
