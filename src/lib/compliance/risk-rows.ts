import type { Company, RiskLevel } from "@/lib/types";
import { isPlaceholderValue } from "@/lib/compliance/risk-display";

export interface RiskTemplate {
  asset: string;
  threat: string;
  vulnerability: string;
  risk_level: RiskLevel;
  measure: string;
  business_impact: string;
  is_mandatory: boolean;
  deadline_days: number;
  criticality: "critical" | "high" | "medium";
}

function deadlineFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function obligationForLevel(level: RiskLevel, days: number) {
  return {
    is_mandatory: level !== "low",
    criticality: level === "high" ? ("critical" as const) : level === "medium" ? ("high" as const) : ("medium" as const),
    deadline: deadlineFromDays(days),
    escalation_level: 0,
  };
}

/** Fachlich strukturierte Standard-Risiken für KMU nach NIS2-Kontext. */
export function buildRiskTemplates(company: Company): RiskTemplate[] {
  const cloudAsset = company.uses_microsoft_365
    ? "Microsoft 365 / Cloud-Dienste"
    : company.uses_cloud_services
      ? "Cloud-Dienste / SaaS"
      : "E-Mail & Kommunikationssysteme";

  const cloudThreat = company.uses_microsoft_365
    ? "Unbefugter Zugriff auf Unternehmensdaten"
    : "Kompromittierung von Zugangsdaten und Kommunikation";

  const cloudVuln = company.uses_microsoft_365
    ? "Fehlende oder unvollständige MFA-Nutzung"
    : "Schwache Passwortrichtlinien oder fehlende Zwei-Faktor-Authentifizierung";

  const cloudMeasure = company.uses_microsoft_365
    ? "MFA für alle relevanten Benutzerkonten prüfen und dokumentieren"
    : "Zugangsschutz für E-Mail und zentrale Dienste prüfen und MFA einführen";

  const templates: RiskTemplate[] = [
    {
      asset: cloudAsset,
      threat: cloudThreat,
      vulnerability: cloudVuln,
      risk_level: "high",
      measure: cloudMeasure,
      business_impact:
        "Kompromittierte Konten können Datenabfluss, Erpressung und Betriebsunterbrechungen verursachen.",
      is_mandatory: true,
      deadline_days: 30,
      criticality: "critical",
    },
    {
      asset: "Backup-System",
      threat: "Datenverlust nach technischem Ausfall oder Angriff",
      vulnerability: "Wiederherstellung wurde nicht getestet",
      risk_level: "high",
      measure: "Wiederherstellungstest planen und Ergebnis dokumentieren",
      business_impact:
        "Ohne funktionierendes Backup drohen längere Ausfallzeiten und dauerhafter Datenverlust.",
      is_mandatory: true,
      deadline_days: 30,
      criticality: "critical",
    },
    {
      asset: "Mitarbeitende / Benutzerkonten",
      threat: "Fehlverhalten oder Phishing",
      vulnerability: "Fehlende Sicherheitsschulung",
      risk_level: "medium",
      measure: "Schulung durchführen und Teilnahme dokumentieren",
      business_impact:
        "Ungeschulte Mitarbeitende erhöhen das Risiko erfolgreicher Angriffe über E-Mail und Links.",
      is_mandatory: true,
      deadline_days: 60,
      criticality: "high",
    },
    {
      asset: "Endgeräte",
      threat: "Ausnutzung veralteter Software",
      vulnerability: "Kein dokumentierter Patch-Prozess",
      risk_level: "medium",
      measure: "Patch-Verantwortung und Update-Zyklus dokumentieren",
      business_impact:
        "Veraltete Systeme sind ein häufiger Einstiegspunkt für Schadsoftware und Ransomware.",
      is_mandatory: true,
      deadline_days: 45,
      criticality: "high",
    },
    {
      asset: "Dienstleister / externe IT",
      threat: "Risiken durch externe Anbieter",
      vulnerability: "Keine dokumentierte Anbieterbewertung",
      risk_level: "medium",
      measure: "Kritische Dienstleister erfassen und bewerten",
      business_impact:
        "Lieferketten- und Dienstleisterausfälle können direkt die eigene IT-Sicherheit beeinträchtigen.",
      is_mandatory: true,
      deadline_days: 60,
      criticality: "high",
    },
  ];

  if (company.publicly_accessible_systems) {
    templates.push({
      asset: "Öffentlich erreichbare Webanwendungen",
      threat: "Ausnutzung von Schwachstellen durch externe Angreifer",
      vulnerability: "Fehlende regelmäßige Sicherheitsprüfung",
      risk_level: "high",
      measure: "Externe Erreichbarkeit prüfen, Updates und Monitoring dokumentieren",
      business_impact:
        "Öffentliche Systeme sind direkt angreifbar und können zum Einfallstor für weitere Angriffe werden.",
      is_mandatory: true,
      deadline_days: 30,
      criticality: "critical",
    });
  }

  return templates.slice(0, 6);
}

export function templateToRiskRow(
  template: RiskTemplate,
  companyId: string,
  analysisContent: string | null
) {
  const obligation = obligationForLevel(template.risk_level, template.deadline_days);
  return {
    company_id: companyId,
    asset: template.asset,
    threat: template.threat,
    vulnerability: template.vulnerability,
    risk_level: template.risk_level,
    measure: template.measure,
    business_impact: template.business_impact,
    analysis_content: analysisContent,
    ...obligation,
    is_mandatory: template.is_mandatory,
    criticality: template.criticality,
  };
}

function parseRiskLevel(raw: string | undefined): RiskLevel {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("hoch") || v.includes("high") || v.includes("krit")) return "high";
  if (v.includes("niedrig") || v.includes("low")) return "low";
  return "medium";
}

/** Parst Markdown-Tabellenzeilen aus KI- oder Demo-Analyse. */
export function parseRisksFromAnalysis(content: string, companyId: string) {
  const lines = content
    .split("\n")
    .filter(
      (l) =>
        l.includes("|") &&
        !l.startsWith("---") &&
        !/^\|\s*asset\s*\|/i.test(l) &&
        !/^\|\s*---/.test(l)
    );

  return lines.slice(0, 8).map((line) => {
    const parts = line
      .split("|")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const asset = parts[0] ?? "";
    const threat = parts[1] ?? "";
    const vulnerability = parts[2] ?? "";
    const levelRaw = parts[3] ?? parts[2] ?? "";
    const measure = parts.length >= 5 ? parts[4] : parts[3] ?? "";

    const hasFiveCols = parts.length >= 5;
    const risk_level = hasFiveCols
      ? parseRiskLevel(parts[3])
      : parseRiskLevel(levelRaw);
    const finalMeasure = hasFiveCols ? measure : parts[parts.length - 1] ?? "";
    const finalVuln = hasFiveCols ? vulnerability : "";

    const obligation = obligationForLevel(
      risk_level,
      risk_level === "high" ? 30 : risk_level === "medium" ? 60 : 90
    );

    return {
      company_id: companyId,
      asset,
      threat,
      vulnerability: finalVuln,
      risk_level,
      measure: finalMeasure,
      business_impact: null as string | null,
      analysis_content: content,
      ...obligation,
    };
  });
}

function rowQualityScore(row: {
  asset: string;
  threat: string;
  measure: string | null;
}): number {
  let score = 0;
  if (!isPlaceholderValue(row.asset)) score += 3;
  if (!isPlaceholderValue(row.threat)) score += 2;
  if (!isPlaceholderValue(row.measure)) score += 2;
  return score;
}

/** Kombiniert geparste KI-Zeilen mit strukturiertem Katalog — keine Platzhalter. */
export function buildQualityRiskRows(company: Company, analysisContent: string) {
  const templates = buildRiskTemplates(company);
  const parsed = parseRisksFromAnalysis(analysisContent, company.id);

  const rows = templates.map((template, index) => {
    const parsedRow = parsed[index];
    if (parsedRow && rowQualityScore(parsedRow) >= 5) {
      const level = parsedRow.risk_level;
      const obligation = obligationForLevel(
        level,
        level === "high" ? 30 : level === "medium" ? 60 : 90
      );
      return {
        company_id: company.id,
        asset: parsedRow.asset,
        threat: parsedRow.threat,
        vulnerability: isPlaceholderValue(parsedRow.vulnerability)
          ? template.vulnerability
          : parsedRow.vulnerability,
        risk_level: level,
        measure: isPlaceholderValue(parsedRow.measure) ? template.measure : parsedRow.measure,
        business_impact: template.business_impact,
        analysis_content: analysisContent,
        ...obligation,
        is_mandatory: level !== "low",
        criticality: level === "high" ? "critical" : level === "medium" ? "high" : "medium",
      };
    }
    return templateToRiskRow(template, company.id, analysisContent);
  });

  return rows;
}
