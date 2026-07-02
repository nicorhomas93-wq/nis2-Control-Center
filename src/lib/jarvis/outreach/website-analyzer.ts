import { calculateNis2RelevanceScore } from "@/lib/jarvis/outreach/nis2-relevance-score";
import {
  buildAssessmentBullets,
  buildWebPresenceBullets,
  websiteDataStatusFromPresence,
  type AssessmentQuality,
  type WebsiteDataStatus,
} from "@/lib/jarvis/outreach/assessment-quality";
import { resolveWebPresence } from "@/lib/jarvis/outreach/web-presence-resolver";
import type { WebPresenceResult } from "@/lib/jarvis/outreach/web-presence-types";
import { pickBestContactEmail } from "@/lib/jarvis/outreach/email-extract";

export type { WebsiteSnapshot } from "@/lib/jarvis/outreach/website-snapshot";
export { fetchWebsiteSnapshot } from "@/lib/jarvis/outreach/website-snapshot";

export interface LeadAnalysisResult {
  nis2_relevance_score: number;
  /** Confidence der Web-Präsenz-Erkennung (getrennt vom NIS2-Score) */
  assessment_confidence: number;
  assessment_flags: string[];
  assessment_quality: AssessmentQuality;
  nis2_likelihood: "yes" | "no" | "uncertain";
  it_maturity: "low" | "medium" | "high" | "unknown";
  analysis_bullets: string[];
  observation: string;
  web_presence: WebPresenceResult;
  /** Aus Website/Hinweisen extrahiert — nur wenn noch keine E-Mail hinterlegt */
  discovered_contact_email: string | null;
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

function buildExternalDataCoverage(presence: WebPresenceResult): AssessmentQuality["external_data"] {
  switch (presence.webPresenceStatus) {
    case "own_website_confirmed":
      return "vollständig";
    case "group_or_brand_presence":
    case "directory_presence_only":
    case "unclear_presence":
      return "eingeschränkt";
    default:
      return "nicht verfügbar";
  }
}

function buildWebPresenceFlags(presence: WebPresenceResult): string[] {
  const flags: string[] = [];
  if (presence.webPresenceStatus === "unclear_presence") {
    flags.push("Web-Präsenz unklar");
  }
  if (presence.webPresenceStatus === "no_reliable_web_presence") {
    flags.push("Keine belastbare Web-Präsenz erkannt");
  }
  if (presence.webPresenceStatus === "directory_presence_only") {
    flags.push("Nur Verzeichnis/Maps");
  }
  if (presence.webPresenceStatus === "group_or_brand_presence") {
    flags.push("Konzern-/Markenpräsenz");
  }
  return flags;
}

function deriveItMaturity(text: string, websiteStatus: WebsiteDataStatus): LeadAnalysisResult["it_maturity"] {
  if (websiteStatus !== "available") return "unknown";

  let itScore = 0;
  for (const kw of IT_HIGH) {
    if (text.includes(kw)) itScore += 2;
  }
  for (const kw of IT_LOW) {
    if (text.includes(kw)) itScore -= 1;
  }

  if (itScore >= 3) return "high";
  if (itScore <= 0) return "low";
  return "medium";
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
  // --- NIS2-Score: nur Stammdaten (parallel, unabhängig von Web) ---
  const nis2 = calculateNis2RelevanceScore({
    company_name: input.company_name,
    industry: input.industry,
    employee_count: input.employee_count,
    hints: input.hints,
  });

  // --- Web-Präsenz: separater Pfad ---
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

  const webBullets = buildWebPresenceBullets(presence);
  const webFlags = buildWebPresenceFlags(presence);

  const assessment_quality: AssessmentQuality = {
    external_data: buildExternalDataCoverage(presence),
    confidence_percent: presence.webPresenceConfidence,
    flags: webFlags,
    identifiable_assets_found: websiteStatus === "available" ? 1 : 0,
    identifiable_assets_checked: 1,
  };

  const it_maturity = deriveItMaturity(text, websiteStatus);

  const observation = presence.webPresenceNote;

  const emailSource = [
    snapshot.textSample,
    snapshot.title ?? "",
    snapshot.description ?? "",
    input.hints ?? "",
  ].join(" ");

  const discovered_contact_email = input.contact_email?.trim()
    ? null
    : pickBestContactEmail(emailSource, {
        website: snapshot.url ?? input.website,
        companyName: input.company_name,
      });

  return {
    nis2_relevance_score: nis2.score,
    assessment_confidence: presence.webPresenceConfidence,
    assessment_flags: webFlags,
    assessment_quality,
    nis2_likelihood: nis2.nis2_likelihood,
    it_maturity,
    analysis_bullets: [
      ...buildAssessmentBullets(assessment_quality),
      ...webBullets,
      ...nis2.breakdown,
    ].slice(0, 16),
    observation,
    web_presence: presence,
    discovered_contact_email,
  };
}
