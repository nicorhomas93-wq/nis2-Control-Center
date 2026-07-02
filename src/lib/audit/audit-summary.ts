import type { Company, Document, Measure, Risk, Nis2Status } from "@/lib/types";
import { getNis2StatusLabel } from "@/lib/nis2/betroffenheit";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import { formatDate } from "@/lib/utils";
import {
  calculateAuditFolderScore,
  getAuditFolderStatuses,
  getMissingAuditDocumentTypes,
  type AuditFolderStatus,
} from "@/lib/audit/audit-folders";
import { AUDIT_STATUS_LABELS } from "@/lib/audit/audit-folder-quality";
import { isRiskTreated } from "@/lib/compliance/risk-treatment";
import {
  getNis2EvidenceScope,
  NIS2_MANDATORY_SCOPE_MESSAGE,
  NIS2_UNKNOWN_SCOPE_MESSAGE,
  NIS2_VOLUNTARY_SCOPE_MESSAGE,
} from "@/lib/compliance-evidence/types";

const REPORT_VERSION = "1.0";

const LEGAL_NOTICE_READY =
  "Der aktuelle Stand zeigt eine hohe interne Vorbereitungsqualität. Die wesentlichen Nachweise und Maßnahmen sind dokumentiert. Diese Bewertung ersetzt keine externe Prüfung oder Rechtsberatung.";

const LEGAL_NOTICE_OPEN =
  "Es bestehen noch offene Punkte, die vor einer Prüfung bearbeitet werden sollten. Diese Bewertung ersetzt keine externe Prüfung oder Rechtsberatung.";

const LEGAL_NOTICE_BASE =
  "Hinweis: Diese Zusammenfassung dient der internen Orientierung und ersetzt keine individuelle Rechtsberatung.";

export interface BuildAuditSummaryParams {
  company: Company;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  aiNarrative?: string;
  generatedAt?: Date | string;
  securityScore?: number;
  auditReadinessPercent?: number;
  dataQualityPercent?: number;
  nextSteps?: string[];
}

export interface AuditSummaryReportData {
  companyName: string;
  generatedAt: string;
  reportVersion: string;
  nis2Status: string;
  nis2StatusKey: Nis2Status;
  nis2ScopeNotice: string;
  securityScore: number;
  complianceScore: number;
  auditReadinessPercent: number;
  dataQualityPercent: number;
  auditFolderPercent: number;
  auditFolderComplete: number;
  auditFolderIncomplete: number;
  auditFolderMissing: number;
  openRisksCount: number;
  openMeasuresCount: number;
  missingEvidenceCount: number;
  managementAssessment: string;
  folderStatuses: AuditFolderStatus[];
  openMeasures: Measure[];
  openRisks: Risk[];
  nextSteps: string[];
  aiNarrative?: string;
}

function formatRiskLevel(level: string): string {
  const map: Record<string, string> = {
    high: "Hoch",
    medium: "Mittel",
    low: "Niedrig",
  };
  return map[level] ?? level;
}

function formatMeasureStatus(status: string): string {
  const map: Record<string, string> = {
    open: "Offen",
    in_progress: "In Bearbeitung",
    completed: "Umgesetzt",
  };
  return map[status] ?? status;
}

function buildDefaultNextSteps(
  company: Company,
  missingTypes: string[],
  openMeasures: Measure[],
  openRisks: Risk[]
): string[] {
  const steps: string[] = [];

  if (missingTypes.length > 0) {
    steps.push(
      `Fehlende Audit-Dokumente erstellen: ${missingTypes.map((t) => getDocumentTypeLabel(t)).join(", ")}.`
    );
  }
  if (openMeasures.length > 0) {
    steps.push(`${openMeasures.length} offene Maßnahme(n) priorisiert umsetzen.`);
  }
  if (openRisks.length > 0) {
    steps.push(`${openRisks.length} unbehandelte Risiko(en) adressieren.`);
  }
  if (steps.length === 0) {
    steps.push("Audit-Ordner regelmäßig aktualisieren und bei Änderungen neu exportieren.");
  }
  return steps;
}

function getNis2ScopeNotice(company: Company): string {
  const scope = getNis2EvidenceScope(company);
  if (scope === "voluntary") return NIS2_VOLUNTARY_SCOPE_MESSAGE;
  if (scope === "unknown") return NIS2_UNKNOWN_SCOPE_MESSAGE;
  return NIS2_MANDATORY_SCOPE_MESSAGE;
}

export function buildAuditSummaryReportData({
  company,
  documents,
  measures,
  risks,
  aiNarrative,
  generatedAt = new Date(),
  securityScore,
  auditReadinessPercent,
  dataQualityPercent,
  nextSteps: nextStepsInput,
}: BuildAuditSummaryParams): AuditSummaryReportData {
  const folderStatuses = getAuditFolderStatuses(documents, company);
  const missing = getMissingAuditDocumentTypes(documents, company);
  const score = calculateAuditFolderScore(documents, company);
  const openMeasures = measures.filter((m) => m.status !== "completed");
  const openRisks = risks.filter(
    (r) => r.risk_level !== "low" && !isRiskTreated(r, measures)
  );
  const missingEvidence = folderStatuses.filter(
    (s) =>
      s.displayStatus === "evidence_missing" ||
      (s.displayStatus === "missing" && s.documentType !== "lieferantenbewertung")
  ).length;
  const nextSteps =
    nextStepsInput ?? buildDefaultNextSteps(company, missing, openMeasures, openRisks);
  const auditPercent = score.percent;
  const managementAssessment = auditPercent >= 100 ? LEGAL_NOTICE_READY : LEGAL_NOTICE_OPEN;
  const generatedAtIso =
    typeof generatedAt === "string" ? generatedAt : generatedAt.toISOString();

  return {
    companyName: company.company_name ?? "Nicht erfasst",
    generatedAt: generatedAtIso,
    reportVersion: REPORT_VERSION,
    nis2Status: getNis2StatusLabel(company.nis2_status),
    nis2StatusKey: company.nis2_status,
    nis2ScopeNotice: getNis2ScopeNotice(company),
    securityScore: securityScore ?? company.security_score ?? 0,
    complianceScore: company.compliance_score ?? 0,
    auditReadinessPercent: auditReadinessPercent ?? 0,
    dataQualityPercent: dataQualityPercent ?? 0,
    auditFolderPercent: score.percent,
    auditFolderComplete: score.complete,
    auditFolderIncomplete: score.incomplete,
    auditFolderMissing: score.missing,
    openRisksCount: openRisks.length,
    openMeasuresCount: openMeasures.length,
    missingEvidenceCount: missingEvidence,
    managementAssessment,
    folderStatuses,
    openMeasures,
    openRisks,
    nextSteps,
    aiNarrative: aiNarrative?.trim() || undefined,
  };
}

export function buildStructuredAuditSummary(params: BuildAuditSummaryParams): string {
  const data = buildAuditSummaryReportData(params);
  const { company, documents } = params;
  const score = calculateAuditFolderScore(documents, company);

  const lines: string[] = [
    "AUDIT-ZUSAMMENFASSUNG — MANAGEMENT-ÜBERBLICK",
    "============================================",
    "",
    `Unternehmen: ${data.companyName}`,
    `Exportdatum: ${formatDate(data.generatedAt)}`,
    `Security Score: ${data.securityScore}/100`,
    `Audit-Bereitschaft: ${data.auditReadinessPercent}%`,
    `Datenqualität: ${data.dataQualityPercent}%`,
    `Audit-Vorbereitungsstand: ${score.percent}% (${score.complete} vollständig, ${score.incomplete} unvollständig, ${score.missing} fehlend)`,
    `NIS2-Status: ${data.nis2Status}`,
    `Compliance-Score: ${data.complianceScore}%`,
    "",
    "KENNZAHLEN",
    "----------",
    `- Vollständige Bereiche: ${data.auditFolderComplete}`,
    `- Unvollständige Bereiche: ${data.auditFolderIncomplete}`,
    `- Fehlende Bereiche: ${data.auditFolderMissing}`,
    `- Offene Risiken: ${data.openRisksCount}`,
    `- Offene Maßnahmen: ${data.openMeasuresCount}`,
    `- Fehlende / unzureichende Nachweise: ${data.missingEvidenceCount}`,
    "",
    data.managementAssessment,
    "",
    "STATUS JE AUDIT-BEREICH",
    "-----------------------",
  ];

  for (const item of data.folderStatuses) {
    const doc = item.document;
    lines.push(
      `- ${item.label}: ${AUDIT_STATUS_LABELS[item.displayStatus]}${
        doc ? ` (v${doc.version ?? 1}, ${formatDate(doc.updated_at)})` : ""
      }`
    );
    if (item.quality.issues.length) {
      lines.push(`  Hinweise: ${item.quality.issues.join("; ")}`);
    }
  }

  lines.push("", "OFFENE MAßNAHMEN", "----------------");
  if (data.openMeasures.length === 0) {
    lines.push("- (keine offenen Maßnahmen)");
  } else {
    for (const m of data.openMeasures.slice(0, 20)) {
      lines.push(
        `- [${formatMeasureStatus(m.status)}] ${m.title}${m.responsible ? ` (${m.responsible})` : ""}`
      );
    }
  }

  lines.push("", "OFFENE RISIKEN", "--------------");
  if (data.openRisks.length === 0) {
    lines.push("- (keine unbehandelten Risiken)");
  } else {
    for (const r of data.openRisks.slice(0, 15)) {
      lines.push(`- [${formatRiskLevel(r.risk_level)}] ${r.asset}: ${r.threat}`);
    }
  }

  lines.push("", "NÄCHSTE EMPFOHLENE SCHRITTE", "---------------------------");
  for (const step of data.nextSteps) {
    lines.push(`- ${step}`);
  }

  if (data.aiNarrative) {
    lines.push("", "MANAGEMENT-KOMMENTAR", "--------------------", "", data.aiNarrative);
  }

  lines.push("", LEGAL_NOTICE_BASE, "");

  return lines.join("\n");
}

export function buildAuditReadme(
  companyName?: string,
  folderStatuses?: AuditFolderStatus[],
  exportDate: Date = new Date()
): string {
  const name = companyName ?? "Ihr Unternehmen";
  const statusLines =
    folderStatuses?.map(
      (s) =>
        `  ${s.folderName.padEnd(32)} ${AUDIT_STATUS_LABELS[s.displayStatus].padEnd(18)} ${s.quality.scorePercent}%`
    ) ?? [];

  return [
    "TKND NIS2 CONTROL CENTER — AUDIT-ORDNER",
    "======================================",
    "",
    `Unternehmen: ${name}`,
    `Exportiert am: ${formatDate(exportDate.toISOString())}`,
    "",
    "INHALT DIESES PAKETS",
    "--------------------",
    "01_Betroffenheit/              Betroffenheitsanalyse.pdf",
    "02_Risikoanalyse/              Risikoanalyse.pdf",
    "03_Massnahmenplan/             Massnahmenplan.pdf",
    "04_Informationssicherheitsleitlinie/",
    "05_Incident_Response/          Incident_Response.pdf",
    "06_Backup_und_Wiederherstellung/",
    "07_Zugriffskonzept/",
    "08_Lieferantenbewertung/",
    "09_Meldeprozess/",
    "10_Management_Report/          Management_Report.pdf",
    "",
    "README_Audit_Ordner.txt        Diese Datei",
    "Audit_Zusammenfassung.pdf      Management-Überblick (Hauptreport)",
    "",
    "STATUS JE BEREICH",
    "-----------------",
    ...(statusLines.length ? statusLines : ["  (Status nach Export nicht verfügbar)"]),
    "",
    "HINWEIS",
    "-------",
    LEGAL_NOTICE_BASE,
    "Fehlende oder unvollständige Bereiche sind in den PDFs als solche gekennzeichnet.",
    "",
  ].join("\n");
}
