import type { Document } from "@/lib/types";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import { formatDate } from "@/lib/utils";
import { markdownToHtml, markdownToPdfHtml } from "@/lib/markdown/render";
import {
  generateDocumentFileNameFromDocument,
  generateDocumentPrintTitle,
} from "@/lib/fileNaming";
import {
  getGenerationModeLabel,
  resolveGenerationMode,
  type GenerationMode,
} from "@/lib/documents/generation-mode";
import { stripDuplicateDocumentTitle } from "@/lib/documents/print-content";
import { prepareDocumentText } from "@/lib/documents/text-normalize";

export {
  buildExportFilename,
  buildPrintTitle,
  generateDocumentFileName,
  generateDocumentFileNameFromDocument,
  generateDocumentPrintTitle,
} from "@/lib/documents/filename";

export function buildFullMarkdownExport(doc: Document): string {
  const { text: content } = prepareDocumentText(doc.content ?? "");

  const meta = [
    `# ${doc.title}`,
    "",
    "| Feld | Wert |",
    "|---|---|",
    `| Dokumenttyp | ${getDocumentTypeLabel(doc.document_type)} |`,
    `| Dokumentenstatus | ${doc.status} |`,
    `| Version | ${doc.version ?? 1} |`,
    `| Erstellt am | ${formatDate(doc.created_at)} |`,
    `| Zuletzt aktualisiert | ${formatDate(doc.updated_at)} |`,
    `| Erzeugungsmodus | ${getGenerationModeLabel(resolveGenerationMode(doc))} |`,
    "",
    "---",
    "",
  ].join("\n");

  return `${meta}${content}`;
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const PRINT_STYLES = `
@page {
  size: A4;
  margin: 16mm 14mm 18mm 14mm;
}
* { box-sizing: border-box; }
html, body {
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #0f172a;
  background: #fff;
  margin: 0;
  padding: 14mm 12mm;
  width: 210mm;
  max-width: 210mm;
}
.print-header {
  border-bottom: 2px solid #1d4ed8;
  padding-bottom: 12pt;
  margin-bottom: 16pt;
  page-break-after: avoid;
  break-after: avoid-page;
}
.print-brand {
  font-size: 9pt;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1d4ed8;
  margin: 0 0 4pt;
}
.print-title {
  font-size: 20pt;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.25;
  page-break-after: avoid;
  break-after: avoid-page;
}
.meta-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 20pt;
  font-size: 10pt;
  page-break-inside: avoid;
  break-inside: avoid-page;
}
.meta-table th,
.meta-table td {
  border: 1px solid #cbd5e1;
  padding: 6pt 8pt;
  text-align: left;
  vertical-align: top;
}
.meta-table th {
  width: 34%;
  background: #f1f5f9;
  font-weight: 600;
  color: #334155;
}
.meta-table td { color: #0f172a; }
.document-body h1 {
  font-size: 16pt;
  margin: 18pt 0 8pt;
  color: #0f172a;
  page-break-after: avoid;
  break-after: avoid-page;
}
.document-body h2 {
  font-size: 13pt;
  margin: 16pt 0 6pt;
  padding-bottom: 4pt;
  border-bottom: 1px solid #e2e8f0;
  color: #1e293b;
  page-break-after: avoid;
  break-after: avoid-page;
  page-break-inside: avoid;
  break-inside: avoid-page;
}
.document-body h3 {
  font-size: 11.5pt;
  margin: 12pt 0 4pt;
  color: #334155;
  page-break-after: avoid;
  break-after: avoid-page;
}
.document-body p {
  margin: 0 0 8pt;
  text-align: justify;
  orphans: 3;
  widows: 3;
}
.document-body ul.doc-bullet-list,
.document-body ul {
  list-style-type: none;
  padding-left: 22pt;
  margin: 0 0 10pt 0;
}
.document-body ul.doc-bullet-list li::before,
.document-body ul li::before {
  content: "•";
  display: inline-block;
  width: 14pt;
  margin-left: -14pt;
  color: #334155;
}
.document-body ol.doc-numbered-list,
.document-body ol {
  margin: 0 0 10pt 0;
  padding-left: 24pt;
  list-style-type: decimal;
  list-style-position: outside;
}
.document-body ul.doc-bullet-list li,
.document-body ul li {
  margin-bottom: 4pt;
  display: block;
  padding-left: 2pt;
}
.document-body ol.doc-numbered-list li,
.document-body ol li {
  margin-bottom: 4pt;
  display: list-item;
  padding-left: 2pt;
}
.pdf-block {
  page-break-inside: avoid;
  break-inside: avoid-page;
  margin-bottom: 8pt;
}
.document-body h2,
.document-body h3 {
  page-break-after: avoid;
  break-after: avoid-page;
}
.document-body hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 14pt 0;
}
.document-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 12pt;
  font-size: 9.5pt;
}
.document-body thead {
  display: table-header-group;
}
.document-body tr {
  page-break-inside: avoid;
  break-inside: avoid-page;
}
.document-body th,
.document-body td {
  border: 1px solid #cbd5e1;
  padding: 5pt 7pt;
  text-align: left;
  vertical-align: top;
}
.document-body th {
  background: #f8fafc;
  font-weight: 600;
  color: #334155;
}
.document-body tr:nth-child(even) td { background: #fafbfc; }
.print-footer {
  margin-top: 20pt;
  padding-top: 8pt;
  border-top: 1px solid #e2e8f0;
  font-size: 8.5pt;
  color: #64748b;
  page-break-inside: avoid;
  break-inside: avoid-page;
}
@media print {
  html, body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    overflow: visible !important;
  }
}
`;

/** Zusatz-Styles nur für direkten PDF-Export (html2canvas). */
const PDF_EXPORT_STYLES = `
html, body {
  padding: 18mm;
  font-size: 10.5pt;
  line-height: 1.65;
}
.print-brand {
  font-size: 8.5pt;
  margin: 0 0 6pt;
}
.print-title {
  font-size: 17pt;
  line-height: 1.3;
}
.meta-table {
  font-size: 9.5pt;
  margin: 0 0 18pt;
}
.meta-table th,
.meta-table td {
  border: 1px solid #e2e8f0;
  padding: 7pt 9pt;
  line-height: 1.45;
}
.meta-table th {
  background: #f8fafc;
  color: #475569;
}
.document-body {
  font-size: 10.5pt;
  line-height: 1.65;
}
.document-body h1 {
  font-size: 16pt;
  margin: 16pt 0 8pt;
}
.document-body h2 {
  font-size: 12pt;
  font-weight: 700;
  margin: 18pt 0 8pt;
  padding-bottom: 5pt;
}
.document-body h3 {
  font-size: 11.5pt;
  font-weight: 700;
  margin: 14pt 0 6pt;
}
.document-body p {
  font-size: 10.5pt;
  line-height: 1.65;
  margin: 0 0 10pt;
}
.document-body ul.doc-bullet-list,
.document-body ul {
  list-style-type: none;
  padding-left: 20pt;
  margin: 0 0 12pt 0;
}
.document-body ul.doc-bullet-list li::before,
.document-body ul li::before {
  content: "•";
  display: inline-block;
  width: 12pt;
  margin-left: -12pt;
  color: #334155;
}
.document-body ol.doc-numbered-list,
.document-body ol {
  margin: 0 0 12pt 0;
  padding-left: 22pt;
  list-style-type: decimal;
  list-style-position: outside;
}
.document-body ul.doc-bullet-list li,
.document-body ul li {
  margin-bottom: 5pt;
  line-height: 1.6;
  display: block;
  padding-left: 2pt;
}
.document-body ol.doc-numbered-list li,
.document-body ol li {
  margin-bottom: 5pt;
  line-height: 1.6;
  display: list-item;
  padding-left: 2pt;
}
.pdf-block-compact h2 {
  margin-top: 12pt;
}
.pdf-block-compact p:last-child {
  margin-bottom: 4pt;
}
.pdf-block {
  margin-bottom: 10pt;
}
.print-footer {
  display: none !important;
}
`;

function getPrintStyles(forPdf: boolean): string {
  return forPdf ? `${PRINT_STYLES}\n${PDF_EXPORT_STYLES}` : PRINT_STYLES;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPrintMetadataRows(
  doc: Document,
  companyName: string | undefined,
  mode: GenerationMode
): string {
  const rows = [
    ["Dokumenttyp", getDocumentTypeLabel(doc.document_type)],
    ["Dokumentenstatus", doc.status === "published" ? "Veröffentlicht" : "Entwurf"],
    ["Version", `v${doc.version ?? 1}`],
    ["Erstellt am", formatDate(doc.created_at)],
    ["Zuletzt aktualisiert", formatDate(doc.updated_at)],
    ["Unternehmen", companyName ?? "—"],
    ["Erzeugungsmodus", getGenerationModeLabel(mode)],
  ];

  return rows
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("");
}

export function buildPrintHtml(
  doc: Document,
  companyName: string | undefined,
  mode: GenerationMode,
  forPdf = false,
  contentOverride?: string
): string {
  const rawContent = contentOverride ?? doc.content ?? "";
  const { text: printContent } = prepareDocumentText(
    stripDuplicateDocumentTitle(rawContent, doc.title)
  );
  const bodyHtml = forPdf ? markdownToPdfHtml(printContent) : markdownToHtml(printContent);
  const title = generateDocumentPrintTitle(doc, companyName);

  const generatedAt = formatDate(new Date().toISOString());
  const footerHtml = forPdf
    ? ""
    : `<footer class="print-footer">
    Generiert mit TKND NIS2 Control Center · ${escapeHtml(generatedAt)}
  </footer>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${getPrintStyles(forPdf)}</style>
</head>
<body data-generated-at="${escapeHtml(generatedAt)}">
  <header class="print-header">
    <p class="print-brand">TKND NIS2 Control Center</p>
    <h1 class="print-title">${escapeHtml(doc.title)}</h1>
  </header>
  <table class="meta-table">
    <tbody>
      ${buildPrintMetadataRows(doc, companyName, mode)}
    </tbody>
  </table>
  <div class="document-body">
    ${bodyHtml}
  </div>
  ${footerHtml}
</body>
</html>`;
}

export function printDocument(doc: Document, companyName: string | undefined) {
  const mode = resolveGenerationMode(doc);
  const title = generateDocumentPrintTitle(doc, companyName);
  const html = buildPrintHtml(doc, companyName, mode);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    document.body.removeChild(iframe);
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();
  frameDoc.title = title;

  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  };

  frameWindow.onafterprint = cleanup;

  setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    setTimeout(cleanup, 1000);
  }, 250);
}
