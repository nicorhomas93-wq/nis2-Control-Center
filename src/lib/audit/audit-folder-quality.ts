import type { Company, Document } from "@/lib/types";

export type AuditAreaDisplayStatus =
  | "complete"
  | "present"
  | "incomplete"
  | "missing"
  | "outdated"
  | "review_due"
  | "evidence_missing";

export const AUDIT_STATUS_LABELS: Record<AuditAreaDisplayStatus, string> = {
  complete: "Vollständig",
  present: "Vorhanden",
  incomplete: "Unvollständig",
  missing: "Fehlt",
  outdated: "Veraltet",
  review_due: "Review fällig",
  evidence_missing: "Nachweis fehlt",
};

export const AUDIT_STATUS_BADGE_CLASS: Record<AuditAreaDisplayStatus, string> = {
  complete: "bg-emerald-100 text-emerald-800",
  present: "bg-sky-100 text-sky-800",
  incomplete: "bg-orange-100 text-orange-800",
  missing: "bg-red-100 text-red-800",
  outdated: "bg-red-100 text-red-800",
  review_due: "bg-amber-100 text-amber-800",
  evidence_missing: "bg-amber-100 text-amber-800",
};

const MIN_CONTENT_LENGTH = 200;
const OUTDATED_MONTHS = 12;

export interface AuditFolderQuality {
  status: AuditAreaDisplayStatus;
  scorePercent: number;
  issues: string[];
  responsible: string | null;
  lastUpdated: string | null;
  nextReview: string | null;
  hasContent: boolean;
  hasEvidence: boolean;
}

function monthsSince(date: Date): number {
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}

export function evaluateAuditFolderQuality(
  document: Document | undefined,
  company?: Pick<Company, "security_contact_name"> | null
): AuditFolderQuality {
  const responsible = company?.security_contact_name?.trim() || null;

  if (!document) {
    return {
      status: "missing",
      scorePercent: 0,
      issues: ["Kein Dokument für diesen Audit-Bereich vorhanden"],
      responsible,
      lastUpdated: null,
      nextReview: null,
      hasContent: false,
      hasEvidence: false,
    };
  }

  const content = document.content?.trim() ?? "";
  const hasContent = content.length >= MIN_CONTENT_LENGTH;
  const isPublished = document.status === "published";
  const hasEvidence = isPublished && hasContent;
  const updatedAt = new Date(document.updated_at);
  const isOutdated = monthsSince(updatedAt) >= OUTDATED_MONTHS;
  const deadline = document.deadline ? new Date(document.deadline) : null;
  const reviewDue = Boolean(deadline && deadline < new Date());
  const issues: string[] = [];

  if (!hasContent) issues.push("Inhalt fehlt oder ist zu kurz");
  if (!isPublished) issues.push("Dokument ist noch ein Entwurf");
  if (!responsible) issues.push("Verantwortlicher nicht hinterlegt");
  if (isOutdated) issues.push("Dokument ist älter als 12 Monate");
  if (reviewDue) issues.push("Nächste Prüfung überfällig");

  let status: AuditAreaDisplayStatus;
  let scorePercent: number;

  if (isOutdated) {
    status = "outdated";
    scorePercent = 30;
  } else if (!hasContent) {
    status = "incomplete";
    scorePercent = 40;
  } else if (reviewDue) {
    status = "review_due";
    scorePercent = 70;
  } else if (!hasEvidence) {
    status = "evidence_missing";
    scorePercent = 60;
  } else if (!responsible) {
    status = "incomplete";
    scorePercent = 80;
  } else if (hasEvidence && responsible) {
    status = "complete";
    scorePercent = 100;
  } else {
    status = "present";
    scorePercent = 85;
  }

  return {
    status,
    scorePercent,
    issues,
    responsible,
    lastUpdated: document.updated_at,
    nextReview: document.deadline ?? null,
    hasContent,
    hasEvidence,
  };
}

/** Einfacher PDF-Dateiname je Audit-Ordner (ZIP-Struktur). */
export function getAuditFolderPdfBasename(folderName: string): string {
  const map: Record<string, string> = {
    "01_Betroffenheit": "Betroffenheitsanalyse",
    "02_Risikoanalyse": "Risikoanalyse",
    "03_Massnahmenplan": "Massnahmenplan",
    "04_Informationssicherheitsleitlinie": "Informationssicherheitsleitlinie",
    "05_Incident_Response": "Incident_Response",
    "06_Backup_und_Wiederherstellung": "Backup_und_Wiederherstellung",
    "07_Zugriffskonzept": "Zugriffskonzept",
    "08_Lieferantenbewertung": "Lieferantenbewertung",
    "09_Meldeprozess": "Meldeprozess",
    "10_Management_Report": "Management_Report",
  };
  return map[folderName] ?? folderName;
}
