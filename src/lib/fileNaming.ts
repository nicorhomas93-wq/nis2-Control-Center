import type { Document } from "@/lib/types";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";

export interface GenerateDocumentFileNameParams {
  companyName?: string;
  documentType: string;
  version: number;
  extension: string;
  date?: Date | string;
}

/** Dokumenttyp → kurzer Dateizweck (ohne NIS2-Doppelpräfix). */
export const DOCUMENT_TYPE_FILE_PURPOSE: Record<string, string> = {
  nis2_betroffenheitsanalyse: "Betroffenheitsanalyse",
  informationssicherheitsleitlinie: "Informationssicherheitsleitlinie",
  risikoanalyse: "Risikoanalyse",
  massnahmenplan: "Massnahmenplan",
  incident_response_plan: "Incident_Response_Plan",
  backup_konzept: "Backup_Konzept",
  zugriffskonzept: "Zugriffskonzept",
  lieferantenbewertung: "Lieferantenbewertung",
  meldeprozess: "Meldeprozess_Sicherheitsvorfaelle",
  management_zusammenfassung: "Management_Zusammenfassung",
};

export function normalizeGermanForFilename(text: string): string {
  return text
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}

export function normalizeFileNamePart(text: string): string {
  let result = normalizeGermanForFilename(text.trim());
  result = result.replace(/^NIS2[-_\s]*/i, "");
  result = result.replace(/[\s-]+/g, "_");
  result = result.replace(/[^a-zA-Z0-9_]/g, "");
  result = result.replace(/_+/g, "_");
  result = result.replace(/^_+|_+$/g, "");
  return result;
}

export function getDocumentFilePurpose(documentType: string): string {
  const mapped = DOCUMENT_TYPE_FILE_PURPOSE[documentType];
  if (mapped) return mapped;

  const label = getDocumentTypeLabel(documentType);
  return normalizeFileNamePart(label) || "Dokument";
}

export function formatFileNameDate(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return formatFileNameDate(new Date());
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatFileNameVersion(version: number): string {
  const safe = Number.isFinite(version) && version > 0 ? Math.floor(version) : 1;
  return `V${safe}`;
}

/**
 * TKND_NIS2_[Unternehmen]_[Dokumentzweck]_[Version]_[Datum].[Endung]
 */
export function generateDocumentFileName({
  companyName,
  documentType,
  version,
  extension,
  date = new Date(),
}: GenerateDocumentFileNameParams): string {
  const company = normalizeFileNamePart(companyName || "Unternehmen");
  const purpose = getDocumentFilePurpose(documentType);
  const versionPart = formatFileNameVersion(version);
  const datePart = formatFileNameDate(date);
  const ext = extension.replace(/^\./, "").toLowerCase();

  const segments = ["TKND", "NIS2", company, purpose, versionPart, datePart];
  return `${segments.join("_")}.${ext}`;
}

export function generateDocumentFileNameFromDocument(
  doc: Document,
  companyName: string | undefined,
  extension: string,
  date?: Date | string
): string {
  return generateDocumentFileName({
    companyName,
    documentType: doc.document_type,
    version: doc.version ?? 1,
    extension,
    date: date ?? doc.updated_at ?? doc.created_at ?? new Date(),
  });
}

/** Dateiname ohne Endung — für document.title beim PDF-Druck. */
export function generateDocumentPrintTitle(
  doc: Document,
  companyName: string | undefined,
  date?: Date | string
): string {
  const filename = generateDocumentFileNameFromDocument(doc, companyName, "pdf", date);
  return filename.replace(/\.[^.]+$/, "");
}

export interface GenerateAuditPackageFileNameParams {
  companyName?: string;
  date?: Date | string;
}

/**
 * TKND_NIS2_[Unternehmen]_Audit_Ordner_[Datum].zip
 */
export function generateAuditPackageFileName({
  companyName,
  date = new Date(),
}: GenerateAuditPackageFileNameParams): string {
  const company = normalizeFileNamePart(companyName || "Unternehmen");
  const datePart = formatFileNameDate(date);
  return `TKND_NIS2_${company}_Audit_Ordner_${datePart}.zip`;
}

/**
 * Audit_Zusammenfassung_[Unternehmen]_[Datum].pdf
 */
export function generateAuditSummaryPdfFileName({
  companyName,
  date = new Date(),
}: GenerateAuditPackageFileNameParams): string {
  const company = normalizeFileNamePart(companyName || "Unternehmen");
  const datePart = formatFileNameDate(date);
  return `Audit_Zusammenfassung_${company}_${datePart}.pdf`;
}
