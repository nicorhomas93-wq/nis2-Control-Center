import type { WebPresenceStatus, WebPresenceResult } from "@/lib/jarvis/outreach/web-presence-types";

/** Präfix für Web-Präsenz-Zeilen in analysis_bullets */
export const WEB_PRESENCE_BULLET_PREFIX = "【Web-Präsenz】";

/** Präfix für Bewertungsqualität-Zeilen in analysis_bullets */

export const ASSESSMENT_BULLET_PREFIX = "【Bewertungsqualität】";

export type ExternalDataCoverage = "vollständig" | "eingeschränkt" | "nicht verfügbar";

export type WebsiteDataStatus = "none" | "pending" | "unreachable" | "available";

export function websiteDataStatusFromPresence(input: {
  webPresenceStatus?: WebPresenceStatus | null;
  snapshotFetched: boolean;
  hasUrl: boolean;
}): WebsiteDataStatus {
  const status = input.webPresenceStatus;
  if (!input.hasUrl && status === "no_reliable_web_presence") return "none";
  if (!input.snapshotFetched) return input.hasUrl ? "unreachable" : "none";

  switch (status) {
    case "own_website_confirmed":
    case "group_or_brand_presence":
      return "available";
    case "directory_presence_only":
      return "pending";
    case "unclear_presence":
      return "pending";
    default:
      return input.snapshotFetched ? "pending" : "none";
  }
}

export const WEB_PRESENCE_OBSERVATION_FALLBACK =
  "Öffentliche Web-Präsenz nicht eindeutig erkennbar — externe Bewertbarkeit wirkt eingeschränkt. Manuelle Prüfung empfohlen.";

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

export function formatWebPresenceBullet(text: string): string {
  return `${WEB_PRESENCE_BULLET_PREFIX} ${text}`;
}

export function isWebPresenceBullet(bullet: string): boolean {
  return bullet.startsWith(WEB_PRESENCE_BULLET_PREFIX);
}

export function stripWebPresencePrefix(bullet: string): string {
  return bullet.replace(WEB_PRESENCE_BULLET_PREFIX, "").trim();
}

export function buildWebPresenceBullets(presence: WebPresenceResult): string[] {
  const lines = [
    `Status: ${presence.webPresenceStatus} (${presence.webPresenceConfidence}% Confidence)`,
    presence.webPresenceNote,
  ];
  if (presence.detectedWebsiteUrl) {
    lines.push(`Erkannte URL: ${presence.detectedWebsiteUrl}`);
  }
  if (presence.detectedWebsiteType !== "none" && presence.detectedWebsiteType !== "unclear") {
    lines.push(`Typ: ${presence.detectedWebsiteType}`);
  }
  return lines.filter(Boolean).map(formatWebPresenceBullet);
}

export function splitAnalysisBullets(bullets: string[]): {
  assessment: string[];
  webPresence: string[];
  scoring: string[];
} {
  const assessment: string[] = [];
  const webPresence: string[] = [];
  const scoring: string[] = [];
  for (const b of bullets) {
    if (isAssessmentBullet(b)) {
      assessment.push(stripAssessmentPrefix(b));
    } else if (isWebPresenceBullet(b)) {
      webPresence.push(stripWebPresencePrefix(b));
    } else {
      scoring.push(b);
    }
  }
  return { assessment, webPresence, scoring };
}

export function buildAssessmentBullets(quality: AssessmentQuality): string[] {
  const lines = [
    `Externe Datenlage: ${quality.external_data}`,
    `Web-Präsenz-Confidence: ${quality.confidence_percent}%`,
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
  "Öffentliche Web-Präsenz nicht eindeutig erkennbar — externe Bewertbarkeit wirkt eingeschränkt. Manuelle Prüfung empfohlen.";

export const UNREACHABLE_WEBSITE_OBSERVATION =
  "Hinterlegte URL nicht verifizierbar — externe Bewertbarkeit wirkt eingeschränkt. Manuelle Prüfung empfohlen.";
