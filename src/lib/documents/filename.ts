import type { Document } from "@/lib/types";
import {
  generateDocumentFileNameFromDocument,
  generateDocumentPrintTitle,
} from "@/lib/fileNaming";

/** @deprecated Nutze generateDocumentFileNameFromDocument aus @/lib/fileNaming */
export function buildPrintTitle(doc: Document, companyName?: string): string {
  return generateDocumentPrintTitle(doc, companyName);
}

/** @deprecated Nutze generateDocumentFileNameFromDocument aus @/lib/fileNaming */
export function buildExportFilename(
  doc: Document,
  ext: string,
  companyName?: string
): string {
  return generateDocumentFileNameFromDocument(doc, companyName, ext);
}

export {
  generateDocumentFileName,
  generateDocumentFileNameFromDocument,
  generateDocumentPrintTitle,
} from "@/lib/fileNaming";
