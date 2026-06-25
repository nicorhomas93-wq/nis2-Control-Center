import type { Document, DocumentType } from "@/lib/types";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";

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
}

export function getDocumentForFolder(
  documents: Document[],
  documentType: DocumentType
): Document | undefined {
  return documents.find((d) => d.document_type === documentType);
}

export function getAuditFolderStatuses(documents: Document[]): AuditFolderStatus[] {
  return AUDIT_FOLDERS.map((folder) => {
    const document = getDocumentForFolder(documents, folder.documentType);
    return {
      folderName: folder.folderName,
      documentType: folder.documentType,
      label: folder.label,
      present: Boolean(document),
      document,
    };
  });
}

export function getMissingAuditDocumentTypes(documents: Document[]): DocumentType[] {
  return AUDIT_FOLDERS.filter(
    (f) => !getDocumentForFolder(documents, f.documentType)
  ).map((f) => f.documentType);
}

export function calculateAuditFolderScore(documents: Document[]): {
  present: number;
  total: number;
  percent: number;
} {
  const total = AUDIT_FOLDERS.length;
  const present = getAuditFolderStatuses(documents).filter((s) => s.present).length;
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;
  return { present, total, percent };
}

export function getAuditFolderName(documentType: string): string | undefined {
  return AUDIT_FOLDERS.find((f) => f.documentType === documentType)?.folderName;
}

export function formatDocumentTypeList(types: DocumentType[]): string {
  return types.map((t) => getDocumentTypeLabel(t)).join(", ");
}
