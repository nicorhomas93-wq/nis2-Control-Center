import type { Company, Document, Measure, Risk } from "@/lib/types";
import type { AuditFolderDefinition } from "@/lib/audit/audit-folders";
import { AUDIT_FOLDERS } from "@/lib/audit/audit-folders";
import {
  evaluateAuditFolderQuality,
  type AuditFolderQuality,
  AUDIT_STATUS_LABELS,
} from "@/lib/audit/audit-folder-quality";
import type { AuditSummaryReportData } from "@/lib/audit/audit-summary";
import { buildPrintHtml } from "@/lib/documents/export";
import { resolveGenerationMode } from "@/lib/documents/generation-mode";
import { formatDate } from "@/lib/utils";
import { getNis2StatusLabel } from "@/lib/nis2/betroffenheit";
import { generateAuditSummaryPdfFileName } from "@/lib/fileNaming";
import type { ResolvedBranding } from "@/lib/white-label/types";
import { DEFAULT_BRANDING } from "@/lib/white-label/types";

const LEGAL_NOTICE =
  "Dieses Dokument dient der internen Vorbereitung und ersetzt keine rechtliche oder technische Einzelfallprüfung.";

export interface AuditPdfContext {
  company?: Pick<Company, "company_name" | "nis2_status" | "security_contact_name"> | null;
  risks?: Risk[];
  measures?: Measure[];
  quality?: AuditFolderQuality;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function relatedRisks(risks: Risk[] | undefined): string {
  if (!risks?.length) return "<p>Keine verknüpften Risiken erfasst.</p>";
  const rows = risks
    .slice(0, 12)
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.asset)}</td><td>${escapeHtml(r.threat)}</td><td>${escapeHtml(r.risk_level)}</td><td>${escapeHtml(r.measure ?? "—")}</td></tr>`
    )
    .join("");
  return `<table><thead><tr><th>Asset</th><th>Bedrohung</th><th>Level</th><th>Maßnahme</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function relatedMeasures(measures: Measure[] | undefined): string {
  if (!measures?.length) return "<p>Keine verknüpften Maßnahmen erfasst.</p>";
  const rows = measures
    .slice(0, 15)
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.title)}</td><td>${escapeHtml(m.status)}</td><td>${escapeHtml(m.responsible ?? "—")}</td><td>${m.deadline ? escapeHtml(formatDate(m.deadline)) : "—"}</td></tr>`
    )
    .join("");
  return `<table><thead><tr><th>Maßnahme</th><th>Status</th><th>Verantwortlich</th><th>Frist</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildAuditSections(
  folder: AuditFolderDefinition,
  ctx: AuditPdfContext
): string {
  const parts: string[] = [];

  if (folder.documentType === "nis2_betroffenheitsanalyse" && ctx.company) {
    parts.push(
      `<h2>Zusammenfassung</h2><p>NIS2-Status: <strong>${escapeHtml(getNis2StatusLabel(ctx.company.nis2_status))}</strong></p>`
    );
  }

  if (folder.documentType === "risikoanalyse") {
    parts.push(`<h2>Zugehörige Risiken</h2>${relatedRisks(ctx.risks)}`);
  }

  if (folder.documentType === "massnahmenplan") {
    parts.push(`<h2>Zugehörige Maßnahmen</h2>${relatedMeasures(ctx.measures)}`);
  }

  return parts.join("");
}

function buildReviewSection(quality: AuditFolderQuality, responsible: string | null): string {
  return `
    <h2>Änderungs- / Prüfstand</h2>
    <table class="meta-table"><tbody>
      <tr><th>Letzte Aktualisierung</th><td>${quality.lastUpdated ? escapeHtml(formatDate(quality.lastUpdated)) : "—"}</td></tr>
      <tr><th>Nächste Prüfung</th><td>${quality.nextReview ? escapeHtml(formatDate(quality.nextReview)) : "Nicht gesetzt"}</td></tr>
      <tr><th>Verantwortlich</th><td>${escapeHtml(responsible ?? "Nicht hinterlegt")}</td></tr>
      <tr><th>Bewertung</th><td>${escapeHtml(AUDIT_STATUS_LABELS[quality.status])}</td></tr>
    </tbody></table>
    ${quality.issues.length ? `<p><strong>Hinweise:</strong> ${escapeHtml(quality.issues.join("; "))}</p>` : ""}
    <p class="legal-note">${escapeHtml(LEGAL_NOTICE)}</p>
  `;
}

export function buildAuditDocumentPdfHtml(
  doc: Document,
  folder: AuditFolderDefinition,
  companyName: string | undefined,
  ctx: AuditPdfContext = {}
): string {
  const mode = resolveGenerationMode(doc);
  const quality = ctx.quality ?? evaluateAuditFolderQuality(doc, ctx.company);
  const base = buildPrintHtml(doc, companyName, mode, true);
  const incompleteBanner =
    quality.status !== "complete"
      ? `<div class="pdf-block" style="background:#fff7ed;border:1px solid #fdba74;padding:12pt;margin-bottom:12pt;border-radius:4pt;">
          <strong>Hinweis:</strong> Dieser Bereich ist noch unvollständig (${escapeHtml(AUDIT_STATUS_LABELS[quality.status])}).
        </div>`
      : "";

  const extra = `
    ${incompleteBanner}
    <div class="pdf-block">
      <h2>Audit-Bereich</h2>
      <p>${escapeHtml(folder.label)} · Status: ${escapeHtml(AUDIT_STATUS_LABELS[quality.status])}</p>
    </div>
    ${buildAuditSections(folder, ctx)}
    <div class="pdf-block">${buildReviewSection(quality, ctx.company?.security_contact_name ?? quality.responsible)}</div>
  `;

  return base.replace("</body>", `${extra}</body>`);
}

export function buildPlaceholderAuditPdfHtml(
  folder: AuditFolderDefinition,
  companyName: string | undefined,
  ctx: AuditPdfContext = {}
): string {
  const quality = evaluateAuditFolderQuality(undefined, ctx.company);
  const generatedAt = formatDate(new Date().toISOString());
  const name = companyName ?? "Unternehmen";

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"/><title>${escapeHtml(folder.label)}</title>
<style>
body{font-family:system-ui,sans-serif;padding:18mm;color:#0f172a;font-size:11pt;line-height:1.6}
.print-brand{font-size:9pt;color:#1d4ed8;font-weight:600;text-transform:uppercase}
h1{font-size:18pt;margin:8pt 0 16pt}
.warn{background:#fff7ed;border:1px solid #fdba74;padding:12pt;margin:16pt 0}
.legal{font-size:9pt;color:#64748b;margin-top:24pt}
</style></head>
<body data-generated-at="${escapeHtml(generatedAt)}">
  <p class="print-brand">TKND NIS2 Control Center</p>
  <h1>${escapeHtml(folder.label)}</h1>
  <table class="meta-table" style="width:100%;border-collapse:collapse;margin-bottom:16pt">
    <tr><th style="border:1px solid #cbd5e1;padding:6pt;background:#f8fafc;width:35%">Unternehmen</th><td style="border:1px solid #cbd5e1;padding:6pt">${escapeHtml(name)}</td></tr>
    <tr><th style="border:1px solid #cbd5e1;padding:6pt;background:#f8fafc">Audit-Bereich</th><td style="border:1px solid #cbd5e1;padding:6pt">${escapeHtml(folder.folderName)}</td></tr>
    <tr><th style="border:1px solid #cbd5e1;padding:6pt;background:#f8fafc">Erstelldatum</th><td style="border:1px solid #cbd5e1;padding:6pt">${escapeHtml(generatedAt)}</td></tr>
    <tr><th style="border:1px solid #cbd5e1;padding:6pt;background:#f8fafc">Status</th><td style="border:1px solid #cbd5e1;padding:6pt">Fehlt</td></tr>
  </table>
  <div class="warn"><strong>Dieser Bereich ist noch unvollständig.</strong> Es liegt kein Dokument für diesen Audit-Bereich vor. Bitte im Control Center generieren und prüfen.</div>
  ${buildAuditSections(folder, ctx)}
  <div class="pdf-block">${buildReviewSection(quality, ctx.company?.security_contact_name ?? null)}</div>
</body></html>`;
}

export function buildAuditSummaryPdfHtml(
  report: AuditSummaryReportData,
  branding: ResolvedBranding = DEFAULT_BRANDING
): string {
  const generatedAt = formatDate(report.generatedAt);
  const productName = branding.active
    ? `${branding.displayName} ${branding.tagline}`.trim()
    : "TKND NIS2 Control Center";
  const primaryColor = branding.active ? branding.primaryColor : "#1d4ed8";
  const logoBlock = branding.active && branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(productName)}" style="max-height:48px;max-width:200px;margin-bottom:12pt" />`
    : `<p class="print-brand" style="color:${primaryColor}">${escapeHtml(productName)}</p>`;

  const folderRows = report.folderStatuses
    .map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.label)}</td>
          <td>${escapeHtml(AUDIT_STATUS_LABELS[item.displayStatus])}</td>
          <td>${item.quality.scorePercent}%</td>
          <td>${item.document ? `v${item.document.version ?? 1}` : "—"}</td>
        </tr>`
    )
    .join("");

  const measureRows =
    report.openMeasures.length === 0
      ? `<tr><td colspan="3">Keine offenen Maßnahmen</td></tr>`
      : report.openMeasures
          .slice(0, 15)
          .map(
            (m) =>
              `<tr><td>${escapeHtml(m.title)}</td><td>${escapeHtml(m.status)}</td><td>${escapeHtml(m.responsible ?? "—")}</td></tr>`
          )
          .join("");

  const riskRows =
    report.openRisks.length === 0
      ? `<tr><td colspan="3">Keine unbehandelten Risiken</td></tr>`
      : report.openRisks
          .slice(0, 12)
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.asset)}</td><td>${escapeHtml(r.threat)}</td><td>${escapeHtml(r.risk_level)}</td></tr>`
          )
          .join("");

  const nextStepItems = report.nextSteps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"/><title>Audit-Zusammenfassung</title>
<style>
body{font-family:system-ui,sans-serif;padding:18mm;color:#0f172a;font-size:10.5pt;line-height:1.6}
.print-brand{font-size:9pt;font-weight:600;text-transform:uppercase}
h1{font-size:22pt;margin:8pt 0 4pt;color:#0f172a}
h2{font-size:13pt;margin:18pt 0 8pt;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4pt}
.cover{border:1px solid #e2e8f0;border-radius:8pt;padding:24pt;margin-bottom:20pt;background:#f8fafc}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8pt;margin:12pt 0}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10pt;margin:12pt 0}
.kpi{border:1px solid #e2e8f0;border-radius:6pt;padding:10pt;background:#fff}
.kpi strong{display:block;font-size:16pt;color:${primaryColor}}
table{width:100%;border-collapse:collapse;margin:8pt 0;font-size:9.5pt}
th,td{border:1px solid #cbd5e1;padding:6pt;text-align:left;vertical-align:top}
th{background:#f1f5f9}
.note{background:#eff6ff;border:1px solid #bfdbfe;padding:10pt;border-radius:6pt;margin:10pt 0}
.warn{background:#fff7ed;border:1px solid #fdba74;padding:10pt;border-radius:6pt;margin:10pt 0}
.legal{font-size:9pt;color:#64748b;margin-top:24pt}
.pdf-block{page-break-inside:avoid;margin-bottom:12pt}
</style></head>
<body data-generated-at="${escapeHtml(generatedAt)}">
  <div class="cover pdf-block">
    ${logoBlock}
    <h1>Audit-Zusammenfassung</h1>
    <p><strong>Unternehmen:</strong> ${escapeHtml(report.companyName)}</p>
    <div class="meta-grid">
      <p><strong>Erstelldatum:</strong> ${escapeHtml(generatedAt)}</p>
      <p><strong>Report-Version:</strong> ${escapeHtml(report.reportVersion)}</p>
      <p><strong>NIS2-Status:</strong> ${escapeHtml(report.nis2Status)}</p>
      <p><strong>Erstellt mit:</strong> ${escapeHtml(productName)}</p>
    </div>
  </div>

  <div class="pdf-block">
    <h2>Management Summary</h2>
    <div class="kpi-grid">
      <div class="kpi"><span>Security Score</span><strong>${report.securityScore}</strong><span>/ 100</span></div>
      <div class="kpi"><span>Compliance Score</span><strong>${report.complianceScore}</strong><span>%</span></div>
      <div class="kpi"><span>Audit-Bereitschaft</span><strong>${report.auditReadinessPercent}</strong><span>%</span></div>
      <div class="kpi"><span>Datenqualität</span><strong>${report.dataQualityPercent}</strong><span>%</span></div>
      <div class="kpi"><span>Audit-Ordner</span><strong>${report.auditFolderPercent}</strong><span>% vollständig</span></div>
      <div class="kpi"><span>Offene Punkte</span><strong>${report.openMeasuresCount + report.openRisksCount}</strong><span>Maßn. + Risiken</span></div>
    </div>
    <p>${escapeHtml(report.managementAssessment)}</p>
  </div>

  <div class="pdf-block">
    <h2>NIS2-Einstufung</h2>
    <p><strong>Aktueller Betroffenheitsstatus:</strong> ${escapeHtml(report.nis2Status)}</p>
    <p><strong>Grundlage:</strong> Angaben aus dem Betroffenheitscheck und Unternehmensprofil im Control Center.</p>
    <div class="note">${escapeHtml(report.nis2ScopeNotice)}</div>
  </div>

  <div class="pdf-block">
    <h2>Status je Audit-Bereich</h2>
    <table>
      <thead><tr><th>Bereich</th><th>Status</th><th>Qualität</th><th>Version</th></tr></thead>
      <tbody>${folderRows}</tbody>
    </table>
  </div>

  <div class="pdf-block">
    <h2>Offene Maßnahmen</h2>
    <table>
      <thead><tr><th>Maßnahme</th><th>Status</th><th>Verantwortlich</th></tr></thead>
      <tbody>${measureRows}</tbody>
    </table>
  </div>

  <div class="pdf-block">
    <h2>Offene Risiken</h2>
    <table>
      <thead><tr><th>Asset</th><th>Bedrohung</th><th>Level</th></tr></thead>
      <tbody>${riskRows}</tbody>
    </table>
  </div>

  <div class="pdf-block">
    <h2>Nächste empfohlene Schritte</h2>
    <ul>${nextStepItems}</ul>
  </div>

  ${
    report.aiNarrative
      ? `<div class="pdf-block"><h2>Management-Kommentar</h2><p>${escapeHtml(report.aiNarrative).replace(/\n/g, "<br/>")}</p></div>`
      : ""
  }

  <p class="legal">${escapeHtml(LEGAL_NOTICE)}</p>
</body></html>`;
}

export async function downloadAuditSummaryPdf(
  report: AuditSummaryReportData,
  branding: ResolvedBranding = DEFAULT_BRANDING
): Promise<string> {
  const { generatePdfBlobFromHtml } = await import("@/lib/documents/pdf-export");
  const { saveAs } = await import("file-saver");
  const filename = generateAuditSummaryPdfFileName({
    companyName: report.companyName,
    date: report.generatedAt,
  });
  const html = buildAuditSummaryPdfHtml(report, branding);
  const { blob } = await generatePdfBlobFromHtml(html, filename);
  saveAs(blob, filename);
  return filename;
}

export async function downloadAuditAreaPdf(
  doc: Document | undefined,
  documentType: string,
  companyName: string | undefined,
  ctx: AuditPdfContext = {}
): Promise<void> {
  const { generatePdfBlobFromHtml } = await import("@/lib/documents/pdf-export");
  const { saveAs } = await import("file-saver");
  const { getAuditFolderPdfBasename } = await import("@/lib/audit/audit-folder-quality");

  const folder = AUDIT_FOLDERS.find((f) => f.documentType === documentType);
  if (!folder) throw new Error("Unbekannter Audit-Bereich");

  const html = doc
    ? buildAuditDocumentPdfHtml(doc, folder, companyName, ctx)
    : buildPlaceholderAuditPdfHtml(folder, companyName, ctx);
  const filename = `${getAuditFolderPdfBasename(folder.folderName)}.pdf`;
  const { blob } = await generatePdfBlobFromHtml(html, filename);
  saveAs(blob, filename);
}
