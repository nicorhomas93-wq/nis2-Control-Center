import type { ComplianceEvidenceEntryWithFiles } from "@/lib/compliance-evidence/types";
import {
  EVIDENCE_CATEGORY_LABELS,
  EVIDENCE_ENTRY_TYPE_LABELS,
  EVIDENCE_STATUS_LABELS,
  MANDATORY_RELEVANCE_LABELS,
} from "@/lib/compliance-evidence/labels";
import { REVIEW_INTERVAL_LABELS } from "@/lib/compliance-evidence/review-interval";
import { deriveEntryStatus } from "@/lib/compliance-evidence/scoring";
import type { Company } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function buildComplianceEvidenceAuditExport(
  companyName: string,
  company: Pick<Company, "nis2_status"> | null,
  entries: ComplianceEvidenceEntryWithFiles[]
): string {
  const lines: string[] = [
    `# Schulungen & Nachweise – Audit-Export`,
    "",
    `**Unternehmen:** ${companyName}`,
    `**Stand:** ${formatDate(new Date().toISOString())}`,
    `**NIS2-Status:** ${company?.nis2_status ?? "unbekannt"}`,
    `**Anzahl Einträge:** ${entries.length}`,
    "",
    "## Übersicht",
    "",
    "| Titel | Kategorie | Typ | Status | Pflicht | Review | Dateien |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const entry of entries) {
    const status = deriveEntryStatus(entry, entry.files, company);
    lines.push(
      `| ${entry.title} | ${EVIDENCE_CATEGORY_LABELS[entry.category]} | ${EVIDENCE_ENTRY_TYPE_LABELS[entry.entry_type]} | ${EVIDENCE_STATUS_LABELS[status]} | ${MANDATORY_RELEVANCE_LABELS[entry.mandatory_relevance]} | ${entry.next_review_at ? formatDate(entry.next_review_at) : "—"} | ${entry.files.filter((f) => f.is_current).length} |`
    );
  }

  lines.push("", "## Einzelnachweise", "");

  for (const entry of entries) {
    const status = deriveEntryStatus(entry, entry.files, company);
    lines.push(`### ${entry.title}`, "");
    lines.push(`- **Kategorie:** ${EVIDENCE_CATEGORY_LABELS[entry.category]}`);
    lines.push(`- **Typ:** ${EVIDENCE_ENTRY_TYPE_LABELS[entry.entry_type]}`);
    lines.push(`- **Status:** ${EVIDENCE_STATUS_LABELS[status]}`);
    lines.push(`- **Pflichtrelevant:** ${MANDATORY_RELEVANCE_LABELS[entry.mandatory_relevance]}`);
    if (entry.conducted_at) lines.push(`- **Durchführung:** ${formatDate(entry.conducted_at)}`);
    if (entry.responsible) lines.push(`- **Verantwortlich:** ${entry.responsible}`);
    if (entry.participants_target) lines.push(`- **Zielgruppe:** ${entry.participants_target}`);
    if (entry.department) lines.push(`- **Abteilung:** ${entry.department}`);
    if (entry.participant_count != null) {
      lines.push(`- **Teilnehmer:** ${entry.participant_count}`);
    }
    if (entry.valid_until) lines.push(`- **Gültig bis:** ${formatDate(entry.valid_until)}`);
    if (entry.next_review_at) lines.push(`- **Nächster Review:** ${formatDate(entry.next_review_at)}`);
    if (entry.review_interval) {
      lines.push(
        `- **Reviewintervall:** ${REVIEW_INTERVAL_LABELS[entry.review_interval as keyof typeof REVIEW_INTERVAL_LABELS] ?? entry.review_interval}`
      );
    }
    if (entry.description) lines.push(`- **Beschreibung:** ${entry.description}`);

    if (entry.recommended_file_labels?.length) {
      lines.push("", "**Empfohlene Dateien:**");
      for (const label of entry.recommended_file_labels) {
        lines.push(`- ${label}`);
      }
    }

    lines.push("", "**Hochgeladene Dateien:**");
    const currentFiles = entry.files.filter((f) => f.is_current);
    if (currentFiles.length === 0) {
      lines.push("- (keine)");
    } else {
      for (const file of currentFiles) {
        lines.push(`- ${file.file_name} (v${file.version}, ${formatDate(file.uploaded_at)})`);
      }
    }

    if (entry.external_links?.length) {
      lines.push("", "**Externe Links:**");
      for (const link of entry.external_links) {
        lines.push(`- [${link.label}](${link.url})`);
      }
    }

    lines.push("");
  }

  lines.push(
    "---",
    "",
    "_Automatisch erzeugt aus dem Modul Schulungen & Nachweise._",
    "_Geeignet als Ergänzung zum Audit-Ordner und für interne Prüfungen._"
  );

  return lines.join("\n");
}
