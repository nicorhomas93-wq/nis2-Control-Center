import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Company, Document, Measure, Risk } from "@/lib/types";
import { AUDIT_FOLDERS } from "@/lib/audit/audit-folders";
import { getAuditFolderPdfBasename } from "@/lib/audit/audit-folder-quality";
import { buildAuditReadme } from "@/lib/audit/audit-summary";
import {
  buildAuditDocumentPdfHtml,
  buildAuditSummaryPdfHtml,
  buildPlaceholderAuditPdfHtml,
} from "@/lib/audit/audit-pdf";
import { generateAuditPackageFileName } from "@/lib/fileNaming";
import { generatePdfBlobFromHtml } from "@/lib/documents/pdf-export";

export interface DownloadAuditPackageOptions {
  documents: Document[];
  companyName?: string;
  company?: Pick<Company, "company_name" | "nis2_status" | "security_contact_name"> | null;
  summaryText: string;
  risks?: Risk[];
  measures?: Measure[];
  folderStatuses?: ReturnType<typeof import("@/lib/audit/audit-folders").getAuditFolderStatuses>;
  onProgress?: (message: string) => void;
}

/**
 * Erstellt und lädt das Audit-ZIP mit PDFs je Bereich (inkl. Platzhalter) herunter.
 */
export async function downloadAuditPackage({
  documents,
  companyName,
  company,
  summaryText,
  risks = [],
  measures = [],
  folderStatuses,
  onProgress,
}: DownloadAuditPackageOptions): Promise<string> {
  const zip = new JSZip();
  const exportDate = new Date();

  onProgress?.("Audit-Paket wird vorbereitet…");

  zip.file(
    "README_Audit_Ordner.txt",
    buildAuditReadme(companyName, folderStatuses, exportDate)
  );
  zip.file("Audit_Zusammenfassung.txt", summaryText);

  onProgress?.("Audit-Zusammenfassung als PDF wird erstellt…");
  const summaryPdf = await generatePdfBlobFromHtml(
    buildAuditSummaryPdfHtml(summaryText, companyName),
    "Audit_Zusammenfassung.pdf"
  );
  zip.file("Audit_Zusammenfassung.pdf", summaryPdf.blob);

  for (const folder of AUDIT_FOLDERS) {
    const doc = documents.find((d) => d.document_type === folder.documentType);
    const status = folderStatuses?.find((s) => s.folderName === folder.folderName);
    const quality = status?.quality;
    const pdfName = `${getAuditFolderPdfBasename(folder.folderName)}.pdf`;
    const zipPath = `${folder.folderName}/${pdfName}`;
    const ctx = { company, risks, measures, quality };

    try {
      onProgress?.(`PDF wird erstellt: ${folder.label}…`);
      const html = doc
        ? buildAuditDocumentPdfHtml(doc, folder, companyName, ctx)
        : buildPlaceholderAuditPdfHtml(folder, companyName, ctx);
      const { blob } = await generatePdfBlobFromHtml(html, pdfName);
      zip.file(zipPath, blob);
    } catch {
      onProgress?.(`PDF-Fallback: ${folder.label}…`);
      const html = buildPlaceholderAuditPdfHtml(folder, companyName, ctx);
      const { blob } = await generatePdfBlobFromHtml(html, pdfName);
      zip.file(zipPath, blob);
    }
  }

  onProgress?.("ZIP-Archiv wird zusammengestellt…");
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const zipFilename = generateAuditPackageFileName({ companyName, date: exportDate });
  saveAs(zipBlob, zipFilename);

  return zipFilename;
}
