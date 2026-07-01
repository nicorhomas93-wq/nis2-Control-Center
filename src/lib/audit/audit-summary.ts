import type { Company, Document, Measure, Risk } from "@/lib/types";
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

const LEGAL_NOTICE_READY =
  "Der aktuelle Stand spricht für eine gute interne Vorbereitung. Eine externe Prüfung oder Rechtsberatung wird dadurch nicht ersetzt.";

const LEGAL_NOTICE_OPEN =
  "Es bestehen noch offene Punkte, die vor einer Prüfung bearbeitet werden sollten.";

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
  nextSteps?: string[];
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

export function buildStructuredAuditSummary({
  company,
  documents,
  measures,
  risks,
  aiNarrative,
  generatedAt = new Date(),
  securityScore,
  auditReadinessPercent,
  nextSteps: nextStepsInput,
}: BuildAuditSummaryParams): string {
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
    nextStepsInput ??
    buildDefaultNextSteps(company, missing, openMeasures, openRisks);

  const auditPercent = score.percent;
  const managementNotice = auditPercent >= 100 ? LEGAL_NOTICE_READY : LEGAL_NOTICE_OPEN;

  const lines: string[] = [
    "AUDIT-ZUSAMMENFASSUNG — MANAGEMENT-ÜBERBLICK",
    "============================================",
    "",
    `Unternehmen: ${company.company_name ?? "Nicht erfasst"}`,
    `Exportdatum: ${formatDate(typeof generatedAt === "string" ? generatedAt : generatedAt.toISOString())}`,
    `Security Score: ${securityScore ?? company.security_score ?? 0}/100`,
    `Audit-Bereitschaft: ${auditReadinessPercent ?? "—"}%`,
    `Audit-Vorbereitungsstand: ${score.percent}% (${score.complete} vollständig, ${score.incomplete} unvollständig, ${score.missing} fehlend)`,
    `NIS2-Status: ${getNis2StatusLabel(company.nis2_status)}`,
    `Compliance-Score: ${company.compliance_score ?? 0}%`,
    "",
    "KENNZAHLEN",
    "----------",
    `- Vollständige Bereiche: ${score.complete}`,
    `- Unvollständige Bereiche: ${score.incomplete}`,
    `- Fehlende Bereiche: ${score.missing}`,
    `- Offene Risiken: ${openRisks.length}`,
    `- Offene Maßnahmen: ${openMeasures.length}`,
    `- Fehlende / unzureichende Nachweise: ${missingEvidence}`,
    "",
    managementNotice,
    "",
    "STATUS JE AUDIT-BEREICH",
    "-----------------------",
  ];

  for (const item of folderStatuses) {
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
  if (openMeasures.length === 0) {
    lines.push("- (keine offenen Maßnahmen)");
  } else {
    for (const m of openMeasures.slice(0, 20)) {
      lines.push(
        `- [${formatMeasureStatus(m.status)}] ${m.title}${m.responsible ? ` (${m.responsible})` : ""}`
      );
    }
  }

  lines.push("", "OFFENE RISIKEN", "--------------");
  if (openRisks.length === 0) {
    lines.push("- (keine unbehandelten Risiken)");
  } else {
    for (const r of openRisks.slice(0, 15)) {
      lines.push(`- [${formatRiskLevel(r.risk_level)}] ${r.asset}: ${r.threat}`);
    }
  }

  lines.push("", "NÄCHSTE EMPFOHLENE SCHRITTE", "---------------------------");
  for (const step of nextSteps) {
    lines.push(`- ${step}`);
  }

  if (aiNarrative?.trim()) {
    lines.push("", "MANAGEMENT-KOMMENTAR", "--------------------", "", aiNarrative.trim());
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
    "Audit_Zusammenfassung.pdf      Management-Überblick",
    "Audit_Zusammenfassung.txt      Textversion der Zusammenfassung",
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
