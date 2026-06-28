/** Präfix für Bewertungsqualität-Zeilen in analysis_bullets */
import type { WebPresenceStatus } from "@/lib/jarvis/outreach/web-presence-types";

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

export function buildAssessmentBullets(quality: AssessmentQuality, webPresenceNote?: string | null): string[] {
  const lines = [
    `Externe Datenlage: ${quality.external_data}`,
    `Bewertungssicherheit: ${quality.confidence_percent}%`,
    `Identifizierbare Assets: ${quality.identifiable_assets_found} von ${quality.identifiable_assets_checked}`,
  ];
  if (webPresenceNote) {
    lines.push(`Web-Präsenz: ${webPresenceNote}`);
  }
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
