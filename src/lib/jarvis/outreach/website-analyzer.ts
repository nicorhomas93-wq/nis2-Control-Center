import { calculateNis2RelevanceScore } from "@/lib/jarvis/outreach/nis2-relevance-score";
import {
  buildAssessmentBullets,
  websiteDataStatusFromPresence,
  WEB_PRESENCE_OBSERVATION_FALLBACK,
  type AssessmentQuality,
  type WebsiteDataStatus,
} from "@/lib/jarvis/outreach/assessment-quality";
import { resolveWebPresence } from "@/lib/jarvis/outreach/web-presence-resolver";
import type { WebPresenceResult } from "@/lib/jarvis/outreach/web-presence-types";
import { WEB_PRESENCE_STATUS_LABELS } from "@/lib/jarvis/outreach/web-presence-types";
import type { WebsiteSnapshot } from "@/lib/jarvis/outreach/website-snapshot";

export type { WebsiteSnapshot } from "@/lib/jarvis/outreach/website-snapshot";
export { fetchWebsiteSnapshot } from "@/lib/jarvis/outreach/website-snapshot";

export interface LeadAnalysisResult {
  nis2_relevance_score: number;
  assessment_confidence: number;
  assessment_flags: string[];
  assessment_quality: AssessmentQuality;
  nis2_likelihood: "yes" | "no" | "uncertain";
  it_maturity: "low" | "medium" | "high" | "unknown";
  analysis_bullets: string[];
  observation: string;
  web_presence: WebPresenceResult;
}

const IT_HIGH = [
  "iso 27001",
  "soc 2",
  "it-sicherheit",
  "security operations",
  "ciso",
  "siem",
  "penetration",
  "managed security",
];

const IT_LOW = [
  "keine dedizierte it",
  "externer dienstleister",
  "homepage veraltet",
  "under construction",
];

const ASSET_CHECKS: { label: string; keywords: string[] }[] = [
  { label: "Web-Präsenz", keywords: [] },
  { label: "Cloud/Hosting", keywords: ["cloud", "hosting", "microsoft", "365", "azure", "aws"] },
  { label: "Security/Compliance", keywords: ["sicherheit", "security", "compliance", "datenschutz", "iso"] },
  { label: "Organisation", keywords: ["karriere", "jobs", "team", "über uns", "unternehmen"] },
];

function countIdentifiableAssets(text: string, websiteStatus: WebsiteDataStatus): {
  found: number;
  checked: number;
} {
  if (websiteStatus !== "available") {
    return { found: 0, checked: ASSET_CHECKS.length };
  }

  let found = 0;
  for (const check of ASSET_CHECKS) {
    if (check.keywords.length === 0) {
      found += 1;
      continue;
    }
    if (check.keywords.some((kw) => text.includes(kw))) {
      found += 1;
    }
  }
  return { found, checked: ASSET_CHECKS.length };
}

function buildExternalDataCoverage(
  websiteStatus: WebsiteDataStatus,
  presence: WebPresenceResult
): AssessmentQuality["external_data"] {
  if (websiteStatus === "available") return "vollständig";
  if (
    presence.webPresenceStatus === "group_or_brand_presence" ||
    presence.webPresenceStatus === "directory_presence_only" ||
    presence.webPresenceStatus === "unclear_presence"
  ) {
    return "eingeschränkt";
  }
  if (websiteStatus === "pending" || websiteStatus === "unreachable") return "eingeschränkt";
  return "nicht verfügbar";
}

function buildObservation(presence: WebPresenceResult, nis2Score: number): string {
  if (presence.webPresenceNote) return presence.webPresenceNote;

  if (nis2Score >= 7) {
    return "Hohe NIS2-Relevanz auf Basis der Stammdaten — externe Quellen ergänzen die Einordnung.";
  }
  if (nis2Score <= 3) {
    return "Geringe NIS2-Relevanz auf Basis der Stammdaten — keine überhöhte Einordnung.";
  }
  return WEB_PRESENCE_OBSERVATION_FALLBACK;
}

function blendConfidence(nis2Confidence: number, webConfidence: number): number {
  return Math.round(nis2Confidence * 0.6 + webConfidence * 0.4);
}

export async function analyzeLeadFromContext(input: {
  company_name: string;
  industry: string | null;
  employee_count: string | null;
  hints?: string | null;
  website?: string | null;
  city?: string | null;
  contact_email?: string | null;
}): Promise<LeadAnalysisResult> {
  const { presence, snapshot } = await resolveWebPresence({
    company_name: input.company_name,
    website: input.website,
    hints: input.hints,
    city: input.city,
    contact_email: input.contact_email,
  });

  const websiteStatus = websiteDataStatusFromPresence({
    webPresenceStatus: presence.webPresenceStatus,
    snapshotFetched: snapshot.fetched,
    hasUrl: Boolean(snapshot.url ?? input.website),
  });

  const websiteText = snapshot.fetched
    ? [snapshot.title ?? "", snapshot.description ?? "", snapshot.textSample].join(" ")
    : "";

  const text = websiteText.toLowerCase();
  const contextBullets: string[] = [];

  contextBullets.push(
    `Web-Präsenz-Status: ${WEB_PRESENCE_STATUS_LABELS[presence.webPresenceStatus]} (${presence.webPresenceConfidence}% Confidence)`
  );

  if (presence.detectedWebsiteUrl) {
    contextBullets.push(`Erkannte URL: ${presence.detectedWebsiteUrl}`);
  }

  if (websiteStatus === "available") {
    if (snapshot.title) {
      contextBullets.push(`Seitentitel: „${snapshot.title.slice(0, 80)}“`);
    }
    const hasSecurityHints =
      text.includes("sicherheit") ||
      text.includes("security") ||
      text.includes("compliance") ||
      text.includes("datenschutz");
    if (!hasSecurityHints) {
      contextBullets.push(
        "Öffentliche Website: keine erkennbaren Informationssicherheits-Hinweise (Beobachtung, kein Compliance-Befund)"
      );
    } else {
      contextBullets.push("Öffentliche Website: Informationssicherheits-/Compliance-Bezug erkennbar");
    }
    if (text.includes("microsoft") || text.includes("365") || text.includes("cloud")) {
      contextBullets.push("Cloud-/Microsoft-Bezug in öffentlichen Inhalten erkennbar");
    }
  }

  const nis2 = calculateNis2RelevanceScore({
    company_name: input.company_name,
    industry: input.industry,
    employee_count: input.employee_count,
    website_text: websiteText,
    hints: input.hints,
    website_data_status: websiteStatus,
  });

  const blendedConfidence = blendConfidence(nis2.confidence_percent, presence.webPresenceConfidence);
  const assessment_flags = [...new Set([...nis2.assessment_flags])];
  if (presence.webPresenceStatus === "unclear_presence") {
    assessment_flags.push("Web-Präsenz unklar");
  }
  if (presence.webPresenceStatus === "no_reliable_web_presence") {
    assessment_flags.push("Informationslücke");
  }

  const assets = countIdentifiableAssets(text, websiteStatus);
  const assessment_quality: AssessmentQuality = {
    external_data: buildExternalDataCoverage(websiteStatus, presence),
    confidence_percent: blendedConfidence,
    flags: assessment_flags,
    identifiable_assets_found: assets.found,
    identifiable_assets_checked: assets.checked,
  };

  let itScore = 0;
  if (websiteStatus === "available") {
    for (const kw of IT_HIGH) {
      if (text.includes(kw)) itScore += 2;
    }
    for (const kw of IT_LOW) {
      if (text.includes(kw)) itScore -= 1;
    }
  }

  let it_maturity: LeadAnalysisResult["it_maturity"] = "medium";
  if (websiteStatus !== "available") {
    it_maturity = "unknown";
  } else if (itScore >= 3) {
    it_maturity = "high";
  } else if (itScore <= 0) {
    it_maturity = "low";
  }

  const observation = buildObservation(presence, nis2.score);

  return {
    nis2_relevance_score: nis2.score,
    assessment_confidence: blendedConfidence,
    assessment_flags,
    assessment_quality,
    nis2_likelihood: nis2.nis2_likelihood,
    it_maturity,
    analysis_bullets: [
      ...buildAssessmentBullets(assessment_quality, presence.webPresenceNote),
      ...nis2.breakdown,
      ...contextBullets,
    ].slice(0, 14),
    observation,
    web_presence: presence,
  };
}
