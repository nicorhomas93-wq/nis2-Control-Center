import type { Company } from "@/lib/types";
import type {
  ComplianceEvidenceEntry,
  ComplianceEvidenceFile,
  EvidenceEntryStatus,
} from "@/lib/compliance-evidence/types";
import {
  getNis2EvidenceScope,
  isEntryMandatoryForCompany,
  isNis2NotAffected,
} from "@/lib/compliance-evidence/types";

export function isReviewDue(nextReviewAt: string | null): boolean {
  if (!nextReviewAt) return false;
  return new Date(nextReviewAt) <= new Date();
}

export function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

export function deriveEntryStatus(
  entry: Pick<
    ComplianceEvidenceEntry,
    "status" | "valid_until" | "next_review_at" | "mandatory_relevance"
  >,
  files: ComplianceEvidenceFile[],
  company: Pick<Company, "nis2_status"> | null | undefined
): EvidenceEntryStatus {
  if (entry.status === "nicht_zutreffend") return "nicht_zutreffend";

  const currentFiles = files.filter((f) => f.is_current && f.status === "active");
  const hasFiles = currentFiles.length > 0;
  const links = Array.isArray(
    (entry as ComplianceEvidenceEntry).external_links
  )
    ? (entry as ComplianceEvidenceEntry).external_links
    : [];
  const hasLinks = links.length > 0;

  if (isNis2NotAffected(company?.nis2_status) && entry.mandatory_relevance !== "yes") {
    if (hasFiles || hasLinks) return "freiwillig_dokumentiert";
    return "unvollstaendig";
  }

  if (isExpired(entry.valid_until)) return "abgelaufen";
  if (isReviewDue(entry.next_review_at)) return "review_faellig";
  if (!hasFiles && !hasLinks) return "nachweis_fehlt";
  if (!hasFiles) return "unvollstaendig";
  return "vollstaendig";
}

export function countMandatoryGaps(
  entries: Array<ComplianceEvidenceEntry & { files: ComplianceEvidenceFile[] }>,
  company: Pick<Company, "nis2_status"> | null | undefined
): number {
  let gaps = 0;
  for (const entry of entries) {
    if (!isEntryMandatoryForCompany(entry, company)) continue;
    const status = deriveEntryStatus(entry, entry.files, company);
    if (
      status === "nachweis_fehlt" ||
      status === "unvollstaendig" ||
      status === "abgelaufen" ||
      status === "review_faellig"
    ) {
      gaps += 1;
    }
  }
  return gaps;
}

export function buildEvidenceDashboardStats(
  entries: Array<ComplianceEvidenceEntry & { files: ComplianceEvidenceFile[] }>,
  company: Pick<Company, "nis2_status"> | null | undefined
) {
  const scope = getNis2EvidenceScope(company);
  let completeEntries = 0;
  let missingEvidence = 0;
  let reviewsDue = 0;
  let expiredEntries = 0;

  let voluntaryDocumented = 0;
  let mandatoryRelevant = 0;

  for (const entry of entries) {
    const status = deriveEntryStatus(entry, entry.files, company);
    if (status === "vollstaendig" || status === "freiwillig_dokumentiert") {
      completeEntries += 1;
    }
    if (status === "freiwillig_dokumentiert" || status === "freiwillig_empfohlen") {
      voluntaryDocumented += 1;
    }
    if (isEntryMandatoryForCompany(entry, company)) mandatoryRelevant += 1;
    if (status === "nachweis_fehlt" || status === "unvollstaendig") {
      if (isEntryMandatoryForCompany(entry, company)) missingEvidence += 1;
    }
    if (status === "review_faellig") reviewsDue += 1;
    if (status === "abgelaufen") expiredEntries += 1;
  }

  return {
    totalEntries: entries.length,
    completeEntries,
    missingEvidence,
    reviewsDue,
    expiredEntries,
    voluntaryDocumented,
    mandatoryRelevant,
    scope,
    scopeLabel: scope === "mandatory"
      ? "NIS2-betroffen — Nachweise pflichtrelevant"
      : scope === "voluntary"
        ? "Freiwillig empfohlen"
        : "NIS2-Status unklar",
  };
}

export function getAuditReadinessDeduction(
  entries: Array<ComplianceEvidenceEntry & { files: ComplianceEvidenceFile[] }>,
  company: Pick<Company, "nis2_status"> | null | undefined
): { deduction: number; reasons: string[] } {
  const scope = getNis2EvidenceScope(company);
  if (scope === "voluntary" || scope === "unknown") {
    return { deduction: 0, reasons: [] };
  }

  const reasons: string[] = [];
  let deduction = 0;

  for (const entry of entries) {
    if (!isEntryMandatoryForCompany(entry, company)) continue;
    const status = deriveEntryStatus(entry, entry.files, company);
    if (status === "nachweis_fehlt" || status === "unvollstaendig") {
      deduction += 5;
      reasons.push(`fehlender Nachweis: ${entry.title}`);
    } else if (status === "abgelaufen") {
      deduction += 8;
      reasons.push(`abgelaufener Nachweis: ${entry.title}`);
    } else if (status === "review_faellig") {
      deduction += 4;
      reasons.push(`Review fällig: ${entry.title}`);
    }
  }

  return { deduction: Math.min(deduction, 30), reasons };
}
