import type { VendorWithDetails } from "@/lib/vendors/types";
import { VENDOR_CATEGORY_LABELS } from "@/lib/vendors/categories";
import {
  VENDOR_CRITICALITY_LABELS,
  VENDOR_EVIDENCE_LABELS,
  VENDOR_EVIDENCE_STATUS_LABELS,
  VENDOR_RISK_LABELS,
} from "@/lib/vendors/evidence-types";
import {
  getEvidenceLabelForProvider,
  getProviderRiskAdvisory,
} from "@/lib/vendors/provider-catalog";
import { normalizeEvidenceStatus } from "@/lib/vendors/evidence-status";
import { QUESTIONNAIRE_ANSWER_LABELS, VENDOR_QUESTIONNAIRE } from "@/lib/vendors/questionnaire";
import { formatDate } from "@/lib/utils";

function section(title: string, lines: string[]): string {
  return `## ${title}\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`;
}

export function buildVendorAuditDocumentContent(
  companyName: string,
  vendors: VendorWithDetails[]
): string {
  const lines: string[] = [
    `# Lieferantenbewertung – ${companyName}`,
    "",
    `Stand: ${formatDate(new Date().toISOString())}`,
    "",
    `Anzahl Lieferanten: ${vendors.length}`,
    "",
  ];

  if (vendors.length === 0) {
    lines.push(
      "Es sind noch keine Lieferanten erfasst. Bitte Lieferanten im Modul „Lieferanten“ anlegen und bewerten.",
      ""
    );
    return lines.join("\n");
  }

  lines.push("## Lieferantenliste", "");
  lines.push(
    "| Lieferant | Kategorie | Kritikalität | Risiko | Score | Letzte Bewertung | Nächste Wiedervorlage |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const v of vendors) {
    const categoryLabel = VENDOR_CATEGORY_LABELS[v.category ?? "sonstiger"];
    lines.push(
      `| ${v.name} | ${categoryLabel} | ${VENDOR_CRITICALITY_LABELS[v.criticality]} | ${VENDOR_RISK_LABELS[v.risk_level]} | ${v.vendor_score}% | ${v.last_assessed_at ? formatDate(v.last_assessed_at) : "—"} | ${v.next_review_at ? formatDate(v.next_review_at) : "—"} |`
    );
  }

  lines.push("", "## Risikobewertung", "");
  for (const v of vendors) {
    const latest = v.assessments[0];
    const advisory = getProviderRiskAdvisory(v.provider_key);
    const riskLines = [
      `### ${v.name}`,
      `- Kategorie: ${VENDOR_CATEGORY_LABELS[v.category ?? "sonstiger"]}`,
      `- Kritikalität: ${VENDOR_CRITICALITY_LABELS[v.criticality]}`,
      `- Risiko-Level: ${VENDOR_RISK_LABELS[v.risk_level]}`,
      `- Lieferanten-Score: ${v.vendor_score}%`,
    ];
    if (advisory) riskLines.push(`- Hinweis: ${advisory}`);
    riskLines.push(
      latest
        ? `- Bewertung v${latest.version} vom ${formatDate(latest.assessed_at)} (Fragebogen ${latest.questionnaire_score}%, Nachweise ${latest.evidence_score}%)`
        : "- Noch keine versionierte Bewertung gespeichert",
      ""
    );
    lines.push(...riskLines);
  }

  lines.push("## Dokumentenstatus / Nachweise", "");
  for (const v of vendors) {
    lines.push(`### ${v.name}`, "");
    if (v.evidence.length === 0) {
      lines.push("- Keine Nachweise erfasst", "");
      continue;
    }
    for (const e of v.evidence) {
      const label =
        getEvidenceLabelForProvider(v.provider_key, e.evidence_type) ??
        VENDOR_EVIDENCE_LABELS[e.evidence_type];
      const status = VENDOR_EVIDENCE_STATUS_LABELS[normalizeEvidenceStatus(e.status)];
      const valid = e.valid_until ? ` (gültig bis ${formatDate(e.valid_until)})` : "";
      lines.push(`- ${label}: ${status}${valid}`);
    }
    lines.push("");
  }

  lines.push("## Lieferantenfragebogen (letzte Bewertung)", "");
  for (const v of vendors) {
    const latest = v.assessments[0];
    lines.push(`### ${v.name}`, "");
    if (!latest?.questionnaire_answers) {
      lines.push("- Fragebogen noch nicht ausgefüllt", "");
      continue;
    }
    for (const q of VENDOR_QUESTIONNAIRE) {
      const ans = latest.questionnaire_answers[q.key];
      const label = ans ? QUESTIONNAIRE_ANSWER_LABELS[ans] : "—";
      lines.push(`- ${q.label} ${label}`);
    }
    lines.push("");
  }

  lines.push(
    section("Hinweis", [
      "Dieses Dokument wurde automatisch aus dem Lieferantenmodul erzeugt.",
      "Audit-Ordner: 08_Lieferantenbewertung",
      "Versionierte Bewertungen sind in der Lieferanten-Historie nachvollziehbar.",
    ])
  );

  return lines.join("\n");
}
