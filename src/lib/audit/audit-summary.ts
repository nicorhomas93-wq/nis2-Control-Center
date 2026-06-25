import type { Company, Document, Measure, Risk } from "@/lib/types";
import { getNis2StatusLabel } from "@/lib/nis2/betroffenheit";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import { formatDate } from "@/lib/utils";
import {
  calculateAuditFolderScore,
  getAuditFolderStatuses,
  getMissingAuditDocumentTypes,
} from "@/lib/audit/audit-folders";

const LEGAL_NOTICE =
  "Hinweis: Diese Zusammenfassung dient der internen Orientierung und ersetzt keine individuelle Rechtsberatung.";

export interface BuildAuditSummaryParams {
  company: Company;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  aiNarrative?: string;
  generatedAt?: Date | string;
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

function buildNextSteps(
  company: Company,
  missingTypes: string[],
  openMeasures: Measure[]
): string[] {
  const steps: string[] = [];

  if (!company.company_name || !company.industry) {
    steps.push("Unternehmensprofil unter „Unternehmen“ vervollständigen.");
  }

  if (company.nis2_status === "unbekannt") {
    steps.push("NIS2-Betroffenheitscheck unter „Betroffenheit“ durchführen.");
  }

  if (missingTypes.length > 0) {
    steps.push(
      `Fehlende Audit-Dokumente erstellen: ${missingTypes.map((t) => getDocumentTypeLabel(t)).join(", ")}.`
    );
  }

  if (openMeasures.length > 0) {
    steps.push(`${openMeasures.length} offene Maßnahme(n) priorisiert umsetzen.`);
  }

  if (steps.length === 0) {
    steps.push("Audit-Ordner regelmäßig aktualisieren und bei Änderungen neu exportieren.");
    steps.push("Management und Verantwortliche über den aktuellen NIS2-Stand informieren.");
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
}: BuildAuditSummaryParams): string {
  const folderStatuses = getAuditFolderStatuses(documents);
  const present = folderStatuses.filter((s) => s.present);
  const missing = getMissingAuditDocumentTypes(documents);
  const score = calculateAuditFolderScore(documents);
  const openMeasures = measures.filter((m) => m.status !== "completed");
  const nextSteps = buildNextSteps(company, missing, openMeasures);

  const lines: string[] = [
    "AUDIT-ZUSAMMENFASSUNG",
    "=====================",
    "",
    `Unternehmen: ${company.company_name ?? "Nicht erfasst"}`,
    `Datum: ${formatDate(typeof generatedAt === "string" ? generatedAt : generatedAt.toISOString())}`,
    `NIS2-Status: ${getNis2StatusLabel(company.nis2_status)}`,
    `Compliance-Score: ${company.compliance_score ?? 0} %`,
    `Audit-Ordner: ${score.present} von ${score.total} Dokumenten vorhanden (${score.percent} %)`,
    "",
    "VORHANDENE DOKUMENTE",
    "--------------------",
  ];

  if (present.length === 0) {
    lines.push("- (keine)");
  } else {
    for (const item of present) {
      const doc = item.document!;
      lines.push(
        `- ${item.label} (Version v${doc.version ?? 1}, aktualisiert: ${formatDate(doc.updated_at)})`
      );
    }
  }

  lines.push("", "FEHLENDE DOKUMENTE", "------------------");
  if (missing.length === 0) {
    lines.push("- (keine — Audit-Ordner vollständig)");
  } else {
    for (const type of missing) {
      lines.push(`- ${getDocumentTypeLabel(type)}`);
    }
  }

  lines.push("", "OFFENE MAßNAHMEN", "----------------");
  if (openMeasures.length === 0) {
    lines.push("- (keine offenen Maßnahmen)");
  } else {
    for (const m of openMeasures) {
      lines.push(
        `- [${formatMeasureStatus(m.status)}] ${m.title}${m.responsible ? ` (Verantwortlich: ${m.responsible})` : ""}`
      );
    }
  }

  lines.push("", "AKTUELLE RISIKEN", "----------------");
  if (risks.length === 0) {
    lines.push("- (keine erfassten Risiken)");
  } else {
    for (const r of risks.slice(0, 15)) {
      lines.push(`- [${formatRiskLevel(r.risk_level)}] ${r.asset}: ${r.threat}`);
    }
    if (risks.length > 15) {
      lines.push(`- … und ${risks.length - 15} weitere Risiken`);
    }
  }

  lines.push("", "NÄCHSTE SCHRITTE", "----------------");
  for (const step of nextSteps) {
    lines.push(`- ${step}`);
  }

  if (aiNarrative?.trim()) {
    lines.push("", "MANAGEMENT-KOMMENTAR", "--------------------", "", aiNarrative.trim());
  }

  lines.push("", LEGAL_NOTICE, "");

  return lines.join("\n");
}

export function buildAuditReadme(companyName?: string): string {
  const name = companyName ?? "Ihr Unternehmen";
  return [
    "TKND NIS2 CONTROL CENTER — AUDIT-ORDNER",
    "======================================",
    "",
    `Unternehmen: ${name}`,
    `Erstellt: ${formatDate(new Date().toISOString())}`,
    "",
    "Dieses Paket enthält strukturierte NIS2-Auditunterlagen:",
    "",
    "01_Betroffenheit          — NIS2-Betroffenheitsanalyse",
    "02_Risikoanalyse          — Risikoanalyse",
    "03_Massnahmenplan         — Maßnahmenplan",
    "04_Informationssicherheitsleitlinie",
    "05_Incident_Response      — Incident-Response-Plan",
    "06_Backup_und_Wiederherstellung — Backup-Konzept",
    "07_Zugriffskonzept",
    "08_Lieferantenbewertung",
    "09_Meldeprozess           — Meldeprozess für Sicherheitsvorfälle",
    "10_Management_Report      — Management-Zusammenfassung",
    "",
    "Dateien:",
    "- Audit_Zusammenfassung.txt — Übersicht und Status",
    "- README_Audit_Ordner.txt   — diese Datei",
    "- PDF-Dateien je Unterordner (falls Dokumente vorhanden)",
    "",
    "Dateinamensschema:",
    "TKND_NIS2_[Unternehmen]_[Dokumentzweck]_[Version]_[Datum].pdf",
    "",
    LEGAL_NOTICE,
    "",
  ].join("\n");
}
