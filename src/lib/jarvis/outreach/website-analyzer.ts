import { calculateNis2RelevanceScore } from "@/lib/jarvis/outreach/nis2-relevance-score";
import {
  buildAssessmentBullets,
  MISSING_WEBSITE_OBSERVATION,
  UNREACHABLE_WEBSITE_OBSERVATION,
  websiteStatusFromSnapshot,
  type AssessmentQuality,
  type WebsiteDataStatus,
} from "@/lib/jarvis/outreach/assessment-quality";

export interface WebsiteSnapshot {
  url: string | null;
  title: string | null;
  description: string | null;
  textSample: string;
  fetched: boolean;
  error?: string;
}

export async function fetchWebsiteSnapshot(
  website: string | null | undefined
): Promise<WebsiteSnapshot> {
  if (!website?.trim()) {
    return {
      url: null,
      title: null,
      description: null,
      textSample: "",
      fetched: false,
      error: "Keine Website hinterlegt",
    };
  }

  let url = website.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TKND-Outreach-Bot/1.0 (+https://tknd.de)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        url,
        title: null,
        description: null,
        textSample: "",
        fetched: false,
        error: `HTTP ${res.status}`,
      };
    }

    const html = await res.text();
    const title = extractMeta(html, "title") ?? extractTag(html, "title");
    const description =
      extractMeta(html, "description") ?? extractMeta(html, "og:description");
    const textSample = stripHtml(html).slice(0, 4000);

    return { url, title, description, textSample, fetched: true };
  } catch (err) {
    return {
      url,
      title: null,
      description: null,
      textSample: "",
      fetched: false,
      error: err instanceof Error ? err.message : "Fetch fehlgeschlagen",
    };
  }
}

function extractTag(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface LeadAnalysisResult {
  nis2_relevance_score: number;
  assessment_confidence: number;
  assessment_flags: string[];
  assessment_quality: AssessmentQuality;
  nis2_likelihood: "yes" | "no" | "uncertain";
  it_maturity: "low" | "medium" | "high" | "unknown";
  analysis_bullets: string[];
  observation: string;
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
  websiteStatus: WebsiteDataStatus
): AssessmentQuality["external_data"] {
  if (websiteStatus === "available") return "vollständig";
  if (websiteStatus === "pending" || websiteStatus === "unreachable") return "eingeschränkt";
  return "nicht verfügbar";
}

function buildObservation(
  websiteStatus: WebsiteDataStatus,
  nis2Score: number
): string {
  if (websiteStatus === "none") return MISSING_WEBSITE_OBSERVATION;
  if (websiteStatus === "pending") {
    return "Website hinterlegt, aber noch nicht verifiziert — externe Bewertbarkeit steht aus.";
  }
  if (websiteStatus === "unreachable") return UNREACHABLE_WEBSITE_OBSERVATION;

  if (nis2Score >= 7) {
    return "Hohe NIS2-Relevanz auf Basis der Stammdaten — externe Website ergänzt die Einordnung.";
  }
  if (nis2Score <= 3) {
    return "Geringe NIS2-Relevanz auf Basis der Stammdaten — keine überhöhte Einordnung.";
  }
  return "Mittlere NIS2-Relevanz — weitere interne Daten würden die Einordnung schärfen.";
}

export function analyzeLeadFromContext(input: {
  company_name: string;
  industry: string | null;
  employee_count: string | null;
  hints?: string | null;
  website: WebsiteSnapshot;
}): LeadAnalysisResult {
  const websiteStatus = websiteStatusFromSnapshot(input.website);

  const websiteText = [
    input.website.title ?? "",
    input.website.description ?? "",
    input.website.textSample,
  ].join(" ");

  const text = websiteText.toLowerCase();
  const contextBullets: string[] = [];

  if (websiteStatus === "available") {
    if (input.website.title) {
      contextBullets.push(`Seitentitel: „${input.website.title.slice(0, 80)}“`);
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

  const assets = countIdentifiableAssets(text, websiteStatus);
  const assessment_quality: AssessmentQuality = {
    external_data: buildExternalDataCoverage(websiteStatus),
    confidence_percent: nis2.confidence_percent,
    flags: [...new Set([...nis2.assessment_flags])],
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

  const observation = buildObservation(websiteStatus, nis2.score);

  return {
    nis2_relevance_score: nis2.score,
    assessment_confidence: nis2.confidence_percent,
    assessment_flags: assessment_quality.flags,
    assessment_quality,
    nis2_likelihood: nis2.nis2_likelihood,
    it_maturity,
    analysis_bullets: [
      ...buildAssessmentBullets(assessment_quality),
      ...nis2.breakdown,
      ...contextBullets,
    ].slice(0, 12),
    observation,
  };
}
