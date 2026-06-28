import type { B2BOutreachLead } from "@/lib/types";
import type { WebPresenceEvidence } from "@/lib/jarvis/outreach/web-presence-types";

export function mapOutreachLead(row: Record<string, unknown>): B2BOutreachLead {
  return {
    ...(row as unknown as B2BOutreachLead),
    analysis_bullets: Array.isArray(row.analysis_bullets)
      ? (row.analysis_bullets as string[])
      : [],
    web_presence_evidence: parseWebPresenceEvidence(row.web_presence_evidence),
  };
}

function parseWebPresenceEvidence(value: unknown): WebPresenceEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is WebPresenceEvidence =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as WebPresenceEvidence).source === "string" &&
      typeof (item as WebPresenceEvidence).reason === "string"
  );
}

export function webPresenceFieldsFromResult(presence: {
  detectedWebsiteUrl?: string;
  detectedWebsiteType: string;
  webPresenceStatus: string;
  webPresenceConfidence: number;
  webPresenceNote: string;
  webPresenceEvidence: WebPresenceEvidence[];
}): Record<string, unknown> {
  return {
    detected_website_url: presence.detectedWebsiteUrl ?? null,
    detected_website_type: presence.detectedWebsiteType,
    web_presence_status: presence.webPresenceStatus,
    web_presence_confidence: presence.webPresenceConfidence,
    web_presence_note: presence.webPresenceNote,
    web_presence_evidence: presence.webPresenceEvidence,
  };
}
