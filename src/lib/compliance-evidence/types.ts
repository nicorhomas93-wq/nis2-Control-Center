import type { Company, Nis2Status } from "@/lib/types";

export type EvidenceCategory =
  | "schulungen"
  | "phishing_awareness"
  | "mfa_zugriff"
  | "backup_wiederherstellung"
  | "incident_response"
  | "lieferanten"
  | "richtlinien"
  | "audit"
  | "sonstige";

export type EvidenceEntryType =
  | "schulung"
  | "teilnahmebestaetigung"
  | "phishing_auswertung"
  | "mfa_nachweis"
  | "backup_nachweis"
  | "incident_nachweis"
  | "lieferanten_nachweis"
  | "richtlinie"
  | "audit_beleg"
  | "sonstiges";

export type EvidenceEntryStatus =
  | "vollstaendig"
  | "unvollstaendig"
  | "nachweis_fehlt"
  | "review_faellig"
  | "abgelaufen"
  | "freiwillig_dokumentiert"
  | "nicht_zutreffend";

export type EvidenceMandatoryRelevance = "yes" | "no" | "nis2_dependent";

export type Nis2EvidenceScope = "mandatory" | "voluntary" | "unknown";

export interface EvidenceExternalLink {
  label: string;
  url: string;
}

export interface ComplianceEvidenceEntry {
  id: string;
  company_id: string;
  title: string;
  category: EvidenceCategory;
  entry_type: EvidenceEntryType;
  description: string | null;
  conducted_at: string | null;
  responsible: string | null;
  valid_until: string | null;
  next_review_at: string | null;
  status: EvidenceEntryStatus;
  mandatory_relevance: EvidenceMandatoryRelevance;
  external_links: EvidenceExternalLink[];
  linked_risk_ids: string[];
  linked_measure_ids: string[];
  linked_task_ids: string[];
  linked_vendor_ids: string[];
  linked_audit_areas: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ComplianceEvidenceFile {
  id: string;
  entry_id: string;
  company_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  file_url: string | null;
  version: number;
  is_current: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  status: "active" | "archived";
}

export interface ComplianceEvidenceEntryWithFiles extends ComplianceEvidenceEntry {
  files: ComplianceEvidenceFile[];
}

export interface ComplianceEvidenceDashboardStats {
  totalEntries: number;
  completeEntries: number;
  missingEvidence: number;
  reviewsDue: number;
  expiredEntries: number;
  scope: Nis2EvidenceScope;
  scopeLabel: string;
}

export function isNis2Affected(status: Nis2Status | null | undefined): boolean {
  return (
    status === "moeglicherweise_betroffen" ||
    status === "wahrscheinlich_wichtige_einrichtung" ||
    status === "wahrscheinlich_besonders_wichtige_einrichtung"
  );
}

export function isNis2StatusUnknown(status: Nis2Status | null | undefined): boolean {
  return !status || status === "unbekannt";
}

export function isNis2NotAffected(status: Nis2Status | null | undefined): boolean {
  return status === "nicht_betroffen";
}

export function getNis2EvidenceScope(
  company: Pick<Company, "nis2_status"> | null | undefined
): Nis2EvidenceScope {
  const status = company?.nis2_status;
  if (isNis2StatusUnknown(status)) return "unknown";
  if (isNis2NotAffected(status)) return "voluntary";
  if (isNis2Affected(status)) return "mandatory";
  return "unknown";
}

export function getNis2EvidenceScopeLabel(scope: Nis2EvidenceScope): string {
  switch (scope) {
    case "mandatory":
      return "NIS2-betroffen — Nachweise pflichtrelevant";
    case "voluntary":
      return "Freiwillig empfohlen";
    case "unknown":
      return "NIS2-Status unklar";
  }
}

export function isEntryMandatoryForCompany(
  entry: Pick<ComplianceEvidenceEntry, "mandatory_relevance" | "status">,
  company: Pick<Company, "nis2_status"> | null | undefined
): boolean {
  if (entry.status === "nicht_zutreffend" || entry.status === "freiwillig_dokumentiert") {
    return false;
  }
  if (entry.mandatory_relevance === "yes") return true;
  if (entry.mandatory_relevance === "no") return false;
  return isNis2Affected(company?.nis2_status);
}

export const NIS2_UNKNOWN_SCOPE_MESSAGE =
  "Der NIS2-Betroffenheitsstatus ist noch nicht geklärt. Bitte führen Sie den Betroffenheitscheck durch.";

export const NIS2_VOLUNTARY_SCOPE_MESSAGE =
  "Ihr Unternehmen ist aktuell nicht als NIS2-betroffen eingestuft. Schulungen und Nachweise können freiwillig zur Sicherheits- und Organisationsdokumentation gepflegt werden.";
