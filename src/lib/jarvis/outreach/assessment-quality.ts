/** Präfix für Bewertungsqualität-Zeilen in analysis_bullets */
export const ASSESSMENT_BULLET_PREFIX = "【Bewertungsqualität】";

export type ExternalDataCoverage = "vollständig" | "eingeschränkt" | "nicht verfügbar";

export type WebsiteDataStatus = "none" | "pending" | "unreachable" | "available";

export interface AssessmentQuality {
  external_data: ExternalDataCoverage;
  confidence_percent: number;
  flags: string[];
  identifiable_assets_found: number;
  identifiable_assets_checked: number;
}

export function formatAssessmentBullet(text: string): string {
  return `${ASSESSMENT_BULLET_PREFIX} ${text}`;
}

export function isAssessmentBullet(bullet: string): boolean {
  return bullet.startsWith(ASSESSMENT_BULLET_PREFIX);
}

export function stripAssessmentPrefix(bullet: string): string {
  return bullet.replace(ASSESSMENT_BULLET_PREFIX, "").trim();
}

export function splitAnalysisBullets(bullets: string[]): {
  assessment: string[];
  scoring: string[];
} {
  const assessment: string[] = [];
  const scoring: string[] = [];
  for (const b of bullets) {
    if (isAssessmentBullet(b)) {
      assessment.push(stripAssessmentPrefix(b));
    } else {
      scoring.push(b);
    }
  }
  return { assessment, scoring };
}

export function buildAssessmentBullets(quality: AssessmentQuality): string[] {
  const lines = [
    `Externe Datenlage: ${quality.external_data}`,
    `Bewertungssicherheit: ${quality.confidence_percent}%`,
    `Identifizierbare Assets: ${quality.identifiable_assets_found} von ${quality.identifiable_assets_checked}`,
  ];
  for (const flag of quality.flags) {
    lines.push(`Flag: ${flag}`);
  }
  return lines.map(formatAssessmentBullet);
}

export function websiteStatusFromSnapshot(input: {
  url: string | null;
  fetched: boolean;
}): WebsiteDataStatus {
  if (!input.url?.trim()) return "none";
  if (!input.fetched) return "unreachable";
  return "available";
}

export function websiteStatusFromImport(website: string | null | undefined): WebsiteDataStatus {
  return website?.trim() ? "pending" : "none";
}

export const MISSING_WEBSITE_OBSERVATION =
  "Keine öffentlich erkennbare Web-Präsenz → reduzierte Bewertbarkeit der externen Angriffsfläche. Eine vollständige Risikoeinschätzung ist dadurch eingeschränkt.";

export const UNREACHABLE_WEBSITE_OBSERVATION =
  "Keine verifizierbare externe IT-Oberfläche vorhanden – die Bewertung der externen Angriffsfläche ist eingeschränkt.";
