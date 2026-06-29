import type { Company, Document, Measure, Risk } from "@/lib/types";
import type { AuditFolderDefinition } from "@/lib/audit/audit-folders";
import { AUDIT_FOLDERS } from "@/lib/audit/audit-folders";
import {
  evaluateAuditFolderQuality,
  type AuditFolderQuality,
  AUDIT_STATUS_LABELS,
} from "@/lib/audit/audit-folder-quality";
import { buildPrintHtml } from "@/lib/documents/export";
import { resolveGenerationMode } from "@/lib/documents/generation-mode";
import { formatDate } from "@/lib/utils";
import { getNis2StatusLabel } from "@/lib/nis2/betroffenheit";

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
  summaryText: string,
  companyName: string | undefined
): string {
  const generatedAt = formatDate(new Date().toISOString());
  const escaped = escapeHtml(summaryText).replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"/><title>Audit-Zusammenfassung</title>
<style>
body{font-family:system-ui,sans-serif;padding:18mm;color:#0f172a;font-size:10.5pt;line-height:1.65}
.print-brand{font-size:9pt;color:#1d4ed8;font-weight:600;text-transform:uppercase}
h1{font-size:18pt;margin:8pt 0 16pt}
.summary{white-space:normal}
.legal{font-size:9pt;color:#64748b;margin-top:24pt}
</style></head>
<body data-generated-at="${escapeHtml(generatedAt)}">
  <p class="print-brand">TKND NIS2 Control Center</p>
  <h1>Audit-Zusammenfassung</h1>
  <p><strong>Unternehmen:</strong> ${escapeHtml(companyName ?? "—")} · <strong>Exportdatum:</strong> ${escapeHtml(generatedAt)}</p>
  <div class="summary pdf-block">${escaped}</div>
  <p class="legal">${escapeHtml(LEGAL_NOTICE)}</p>
</body></html>`;
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
