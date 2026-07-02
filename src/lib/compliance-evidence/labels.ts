import type { EvidenceCategory, EvidenceEntryType } from "@/lib/compliance-evidence/types";

export const EVIDENCE_CATEGORIES: EvidenceCategory[] = [
  "schulungen",
  "phishing_awareness",
  "mfa_zugriff",
  "backup_wiederherstellung",
  "incident_response",
  "lieferanten",
  "richtlinien",
  "audit",
  "sonstige",
];

export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  schulungen: "Schulungen",
  phishing_awareness: "Phishing & Awareness",
  mfa_zugriff: "MFA & Zugriffssicherheit",
  backup_wiederherstellung: "Backup & Wiederherstellung",
  incident_response: "Incident Response",
  lieferanten: "Lieferanten & Dienstleister",
  richtlinien: "Richtlinien & Unterweisungen",
  audit: "Audit-Nachweise",
  sonstige: "Sonstige Nachweise",
};

export const EVIDENCE_ENTRY_TYPES: EvidenceEntryType[] = [
  "schulung",
  "teilnahmebestaetigung",
  "phishing_auswertung",
  "mfa_nachweis",
  "zugriffskontroll_nachweis",
  "backup_nachweis",
  "incident_nachweis",
  "lieferanten_nachweis",
  "richtlinie",
  "audit_beleg",
  "sonstiges",
];

export const EVIDENCE_ENTRY_TYPE_LABELS: Record<EvidenceEntryType, string> = {
  schulung: "Schulung",
  teilnahmebestaetigung: "Teilnahmebestätigung",
  phishing_auswertung: "Phishing-Auswertung",
  mfa_nachweis: "MFA-Nachweis",
  zugriffskontroll_nachweis: "Zugriffskontroll-Nachweis",
  backup_nachweis: "Backup-Nachweis",
  incident_nachweis: "Incident-Nachweis",
  lieferanten_nachweis: "Lieferanten-Nachweis",
  richtlinie: "Richtlinie",
  audit_beleg: "Audit-Beleg",
  sonstiges: "Sonstiges",
};

export const EVIDENCE_STATUSES: import("@/lib/compliance-evidence/types").EvidenceEntryStatus[] = [
  "vollstaendig",
  "unvollstaendig",
  "nachweis_fehlt",
  "review_faellig",
  "abgelaufen",
  "freiwillig_dokumentiert",
  "freiwillig_empfohlen",
  "wartet_auf_nachweis",
  "nicht_zutreffend",
];

export const EVIDENCE_STATUS_LABELS: Record<
  import("@/lib/compliance-evidence/types").EvidenceEntryStatus,
  string
> = {
  vollstaendig: "Vollständig",
  unvollstaendig: "Unvollständig",
  nachweis_fehlt: "Nachweis fehlt",
  review_faellig: "Review fällig",
  abgelaufen: "Abgelaufen",
  freiwillig_dokumentiert: "Freiwillig dokumentiert",
  freiwillig_empfohlen: "Freiwillig empfohlen",
  wartet_auf_nachweis: "Wartet auf Nachweis",
  nicht_zutreffend: "Nicht zutreffend",
};

export const EVIDENCE_STATUS_BADGE: Record<string, string> = {
  vollstaendig: "bg-emerald-100 text-emerald-800",
  unvollstaendig: "bg-amber-100 text-amber-800",
  nachweis_fehlt: "bg-red-100 text-red-800",
  review_faellig: "bg-orange-100 text-orange-800",
  abgelaufen: "bg-red-100 text-red-800",
  freiwillig_dokumentiert: "bg-slate-100 text-slate-700",
  freiwillig_empfohlen: "bg-blue-100 text-blue-800",
  wartet_auf_nachweis: "bg-amber-100 text-amber-800",
  nicht_zutreffend: "bg-slate-100 text-slate-600",
};

export const MANDATORY_RELEVANCE_LABELS = {
  yes: "Ja — pflichtrelevant",
  no: "Nein — freiwillig",
  nis2_dependent: "Abhängig vom NIS2-Status",
  not_applicable: "Nicht zutreffend",
} as const;

export { REVIEW_INTERVAL_LABELS } from "@/lib/compliance-evidence/review-interval";
