import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Company, Document, Measure, Risk } from "@/lib/types";
import { AUDIT_FOLDERS } from "@/lib/audit/audit-folders";
import { getAuditFolderPdfBasename } from "@/lib/audit/audit-folder-quality";
import {
  buildAuditReadme,
  buildStructuredAuditSummary,
  type AuditSummaryReportData,
} from "@/lib/audit/audit-summary";
import {
  buildAuditDocumentPdfHtml,
  buildAuditSummaryPdfHtml,
  buildPlaceholderAuditPdfHtml,
} from "@/lib/audit/audit-pdf";
import {
  generateAuditPackageFileName,
  generateAuditSummaryPdfFileName,
} from "@/lib/fileNaming";
import { generatePdfBlobFromHtml } from "@/lib/documents/pdf-export";
import type { ResolvedBranding } from "@/lib/white-label/types";
import { DEFAULT_BRANDING } from "@/lib/white-label/types";

export interface DownloadAuditPackageOptions {
  documents: Document[];
  companyName?: string;
  company?: Pick<Company, "company_name" | "nis2_status" | "security_contact_name"> | null;
  reportData: AuditSummaryReportData;
  risks?: Risk[];
  measures?: Measure[];
  folderStatuses?: ReturnType<typeof import("@/lib/audit/audit-folders").getAuditFolderStatuses>;
  branding?: ResolvedBranding;
  onProgress?: (message: string) => void;
}

/**
 * Erstellt und lädt das Audit-ZIP mit PDFs je Bereich (inkl. Platzhalter) herunter.
 */
export async function downloadAuditPackage({
  documents,
  companyName,
  company,
  reportData,
  risks = [],
  measures = [],
  folderStatuses,
  branding = DEFAULT_BRANDING,
  onProgress,
}: DownloadAuditPackageOptions): Promise<string> {
  const zip = new JSZip();
  const exportDate = new Date(reportData.generatedAt);

  onProgress?.("Audit-Paket wird vorbereitet…");

  const summaryText = buildStructuredAuditSummary({
    company: {
      ...(company as Company),
      company_name: reportData.companyName,
      nis2_status: reportData.nis2StatusKey,
      security_score: reportData.securityScore,
      compliance_score: reportData.complianceScore,
    },
    documents,
    measures,
    risks,
    aiNarrative: reportData.aiNarrative,
    generatedAt: reportData.generatedAt,
    securityScore: reportData.securityScore,
    auditReadinessPercent: reportData.auditReadinessPercent,
    dataQualityPercent: reportData.dataQualityPercent,
    nextSteps: reportData.nextSteps,
  });

  zip.file(
    "README_Audit_Ordner.txt",
    `${buildAuditReadme(companyName, folderStatuses, exportDate)}\n\nTECHNISCHER ANHANG — TEXTVERSION\n================================\n\n${summaryText}`
  );

  onProgress?.("Audit-Report wird erstellt…");
  const summaryPdfName = generateAuditSummaryPdfFileName({
    companyName: reportData.companyName,
    date: exportDate,
  });
  const summaryPdf = await generatePdfBlobFromHtml(
    buildAuditSummaryPdfHtml(reportData, branding),
    summaryPdfName
  );
  zip.file(summaryPdfName, summaryPdf.blob);

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
