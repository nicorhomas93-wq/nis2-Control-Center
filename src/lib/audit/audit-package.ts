import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Document } from "@/lib/types";
import { AUDIT_FOLDERS } from "@/lib/audit/audit-folders";
import { buildAuditReadme } from "@/lib/audit/audit-summary";
import { generateAuditPackageFileName, generateDocumentFileNameFromDocument } from "@/lib/fileNaming";
import { buildFullMarkdownExport } from "@/lib/documents/export";
import { generateDocumentPdfBlob } from "@/lib/documents/pdf-export";

export interface DownloadAuditPackageOptions {
  documents: Document[];
  companyName?: string;
  summaryText: string;
  onProgress?: (message: string) => void;
}

/**
 * Erstellt und lädt das Audit-ZIP mit PDFs (oder Markdown-Fallback) herunter.
 */
export async function downloadAuditPackage({
  documents,
  companyName,
  summaryText,
  onProgress,
}: DownloadAuditPackageOptions): Promise<string> {
  const zip = new JSZip();
  const exportDate = new Date();

  zip.file("README_Audit_Ordner.txt", buildAuditReadme(companyName));
  zip.file("Audit_Zusammenfassung.txt", summaryText);

  let pdfCount = 0;

  for (const folder of AUDIT_FOLDERS) {
    const doc = documents.find((d) => d.document_type === folder.documentType);
    if (!doc) continue;

    const pdfFilename = generateDocumentFileNameFromDocument(doc, companyName, "pdf", exportDate);
    const zipPath = `${folder.folderName}/${pdfFilename}`;

    try {
      onProgress?.(`PDF wird erstellt: ${folder.label}…`);
      const { blob } = await generateDocumentPdfBlob(doc, companyName);
      zip.file(zipPath, blob);
      pdfCount++;
    } catch {
      onProgress?.(`PDF-Fallback (Markdown): ${folder.label}…`);
      const mdFilename = generateDocumentFileNameFromDocument(doc, companyName, "md", exportDate);
      zip.file(`${folder.folderName}/${mdFilename}`, buildFullMarkdownExport(doc));
    }
  }

  if (pdfCount === 0 && documents.length > 0) {
    onProgress?.("Keine PDFs erzeugbar — Markdown-Dateien werden verwendet.");
  }

  onProgress?.("ZIP-Archiv wird zusammengestellt…");
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const zipFilename = generateAuditPackageFileName({ companyName, date: exportDate });
  saveAs(zipBlob, zipFilename);

  return zipFilename;
}
