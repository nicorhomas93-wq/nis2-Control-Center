import type { Company, Document, DocumentType } from "@/lib/types";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import {
  evaluateAuditFolderQuality,
  type AuditFolderQuality,
  type AuditAreaDisplayStatus,
} from "@/lib/audit/audit-folder-quality";
import {
  getVendorAuditNaQuality,
  isVendorsNotApplicable,
} from "@/lib/vendors/applicability";

export type { AuditFolderQuality, AuditAreaDisplayStatus };
export {
  AUDIT_STATUS_LABELS,
  AUDIT_STATUS_BADGE_CLASS,
  evaluateAuditFolderQuality,
  getAuditFolderPdfBasename,
} from "@/lib/audit/audit-folder-quality";

export interface AuditFolderDefinition {
  folderName: string;
  documentType: DocumentType;
  label: string;
}

/** Audit-Ordnerstruktur mit zugehörigen Dokumenttypen (10 Bereiche). */
export const AUDIT_FOLDERS: AuditFolderDefinition[] = [
  {
    folderName: "01_Betroffenheit",
    documentType: "nis2_betroffenheitsanalyse",
    label: "NIS2-Betroffenheitsanalyse",
  },
  {
    folderName: "02_Risikoanalyse",
    documentType: "risikoanalyse",
    label: "Risikoanalyse",
  },
  {
    folderName: "03_Massnahmenplan",
    documentType: "massnahmenplan",
    label: "Maßnahmenplan",
  },
  {
    folderName: "04_Informationssicherheitsleitlinie",
    documentType: "informationssicherheitsleitlinie",
    label: "Informationssicherheitsleitlinie",
  },
  {
    folderName: "05_Incident_Response",
    documentType: "incident_response_plan",
    label: "Incident-Response-Plan",
  },
  {
    folderName: "06_Backup_und_Wiederherstellung",
    documentType: "backup_konzept",
    label: "Backup-Konzept",
  },
  {
    folderName: "07_Zugriffskonzept",
    documentType: "zugriffskonzept",
    label: "Zugriffskonzept",
  },
  {
    folderName: "08_Lieferantenbewertung",
    documentType: "lieferantenbewertung",
    label: "Lieferantenbewertung",
  },
  {
    folderName: "09_Meldeprozess",
    documentType: "meldeprozess",
    label: "Meldeprozess für Sicherheitsvorfälle",
  },
  {
    folderName: "10_Management_Report",
    documentType: "management_zusammenfassung",
    label: "Management-Zusammenfassung",
  },
];

export interface AuditFolderStatus {
  folderName: string;
  documentType: DocumentType;
  label: string;
  present: boolean;
  document?: Document;
  quality: AuditFolderQuality;
  displayStatus: AuditAreaDisplayStatus;
}

export function getDocumentForFolder(
  documents: Document[],
  documentType: DocumentType
): Document | undefined {
  return documents.find((d) => d.document_type === documentType);
}

export function getAuditFolderStatuses(
  documents: Document[],
  company?: Pick<Company, "security_contact_name" | "vendors_applicability"> | null
): AuditFolderStatus[] {
  return AUDIT_FOLDERS.map((folder) => {
    if (folder.documentType === "lieferantenbewertung" && isVendorsNotApplicable(company)) {
      const quality = getVendorAuditNaQuality(company);
      return {
        folderName: folder.folderName,
        documentType: folder.documentType,
        label: folder.label,
        present: true,
        document: getDocumentForFolder(documents, folder.documentType),
        quality,
        displayStatus: quality.status,
      };
    }

    const document = getDocumentForFolder(documents, folder.documentType);
    const quality = evaluateAuditFolderQuality(document, company);
    return {
      folderName: folder.folderName,
      documentType: folder.documentType,
      label: folder.label,
      present: Boolean(document) || quality.status === "not_applicable",
      document,
      quality,
      displayStatus: quality.status,
    };
  });
}

export function getMissingAuditDocumentTypes(
  documents: Document[],
  company?: Pick<Company, "vendors_applicability"> | null
): DocumentType[] {
  return AUDIT_FOLDERS.filter((f) => {
    if (f.documentType === "lieferantenbewertung" && isVendorsNotApplicable(company)) {
      return false;
    }
    return !getDocumentForFolder(documents, f.documentType);
  }).map((f) => f.documentType);
}

export function calculateDetailedAuditFolderScore(
  documents: Document[],
  company?: Pick<Company, "security_contact_name" | "vendors_applicability"> | null
): {
  percent: number;
  complete: number;
  incomplete: number;
  missing: number;
  total: number;
  areas: Array<{
    folderName: string;
    label: string;
    quality: AuditFolderQuality;
  }>;
} {
  const areas = AUDIT_FOLDERS.map((folder) => {
    if (folder.documentType === "lieferantenbewertung" && isVendorsNotApplicable(company)) {
      return {
        folderName: folder.folderName,
        label: folder.label,
        quality: getVendorAuditNaQuality(company),
      };
    }
    const document = getDocumentForFolder(documents, folder.documentType);
    const quality = evaluateAuditFolderQuality(document, company);
    return { folderName: folder.folderName, label: folder.label, quality };
  });

  const total = areas.length;
  const complete = areas.filter(
    (a) => a.quality.status === "complete" || a.quality.status === "not_applicable"
  ).length;
  const missing = areas.filter((a) => a.quality.status === "missing").length;
  const incomplete = total - complete - missing;
  const percent =
    total > 0
      ? Math.round(areas.reduce((sum, a) => sum + a.quality.scorePercent, 0) / total)
      : 0;

  return { percent, complete, incomplete, missing, total, areas };
}

export function calculateAuditFolderScore(
  documents: Document[],
  company?: Pick<Company, "security_contact_name" | "vendors_applicability"> | null
): {
  present: number;
  total: number;
  percent: number;
  complete: number;
  incomplete: number;
  missing: number;
} {
  const detailed = calculateDetailedAuditFolderScore(documents, company);
  const present = detailed.total - detailed.missing;
  return {
    present,
    total: detailed.total,
    percent: detailed.percent,
    complete: detailed.complete,
    incomplete: detailed.incomplete,
    missing: detailed.missing,
  };
}

export function getAuditFolderName(documentType: string): string | undefined {
  return AUDIT_FOLDERS.find((f) => f.documentType === documentType)?.folderName;
}

export function formatDocumentTypeList(types: DocumentType[]): string {
  return types.map((t) => getDocumentTypeLabel(t)).join(", ");
}
