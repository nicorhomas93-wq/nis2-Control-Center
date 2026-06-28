export type WebPresenceStatus =
  | "own_website_confirmed"
  | "group_or_brand_presence"
  | "directory_presence_only"
  | "unclear_presence"
  | "no_reliable_web_presence";

export type DetectedWebsiteType =
  | "own_website"
  | "group_website"
  | "brand_website"
  | "directory_only"
  | "none"
  | "unclear";

export type WebPresenceEvidenceSource =
  | "search"
  | "maps"
  | "manual"
  | "domain"
  | "impressum"
  | "directory";

export interface WebPresenceEvidence {
  source: WebPresenceEvidenceSource;
  title?: string;
  url?: string;
  snippet?: string;
  matchedName?: string;
  matchedAddress?: string;
  matchedPhone?: string;
  reason: string;
  scoreImpact: number;
}

export interface WebPresenceResult {
  detectedWebsiteUrl?: string;
  detectedWebsiteType: DetectedWebsiteType;
  webPresenceStatus: WebPresenceStatus;
  webPresenceConfidence: number;
  webPresenceNote: string;
  webPresenceEvidence: WebPresenceEvidence[];
}

export const WEB_PRESENCE_STATUS_LABELS: Record<WebPresenceStatus, string> = {
  own_website_confirmed: "Eigene Website wahrscheinlich",
  group_or_brand_presence: "Konzern-/Markenpräsenz",
  directory_presence_only: "Nur Verzeichnis/Maps",
  unclear_presence: "Präsenz unklar",
  no_reliable_web_presence: "Keine belastbare Präsenz",
};

export const DETECTED_WEBSITE_TYPE_LABELS: Record<DetectedWebsiteType, string> = {
  own_website: "Eigene Website",
  group_website: "Konzernwebsite",
  brand_website: "Dachmarke",
  directory_only: "Verzeichnis",
  none: "Keine erkannt",
  unclear: "Unklar",
};

export function webPresenceBadgeClass(status: WebPresenceStatus): string {
  switch (status) {
    case "own_website_confirmed":
      return "bg-emerald-50 text-emerald-800";
    case "group_or_brand_presence":
      return "bg-sky-50 text-sky-800";
    case "directory_presence_only":
      return "bg-amber-50 text-amber-800";
    case "unclear_presence":
      return "bg-slate-100 text-slate-700";
    case "no_reliable_web_presence":
      return "bg-slate-100 text-slate-500";
  }
}
