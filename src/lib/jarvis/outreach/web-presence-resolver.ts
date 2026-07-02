import { generateCompanyNameVariants } from "@/lib/jarvis/outreach/company-name-normalizer";
import { classifyWebPresence, type ClassifiedPresence } from "@/lib/jarvis/outreach/web-presence-classifier";
import type { WebPresenceEvidence, WebPresenceResult } from "@/lib/jarvis/outreach/web-presence-types";
import { fetchWebsiteSnapshot, type WebsiteSnapshot } from "@/lib/jarvis/outreach/website-snapshot";

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "gmx.de",
  "gmx.net",
  "web.de",
  "t-online.de",
  "outlook.com",
  "hotmail.com",
  "yahoo.de",
  "icloud.com",
  "posteo.de",
]);

const STATUS_RANK: Record<WebPresenceResult["webPresenceStatus"], number> = {
  own_website_confirmed: 5,
  group_or_brand_presence: 4,
  directory_presence_only: 3,
  unclear_presence: 2,
  no_reliable_web_presence: 1,
};

export interface ResolveWebPresenceInput {
  company_name: string;
  website?: string | null;
  hints?: string | null;
  city?: string | null;
  contact_email?: string | null;
}

export interface ResolveWebPresenceOutput {
  presence: WebPresenceResult;
  snapshot: WebsiteSnapshot;
}

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s,;)"'\]]+/gi) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[.,;]+$/, "")))];
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function buildDomainCandidates(slugs: string[]): string[] {
  const urls: string[] = [];
  for (const slug of slugs.slice(0, 4)) {
    urls.push(`https://www.${slug}.de`);
    urls.push(`https://${slug}.de`);
  }
  return urls;
}

function emailDomainUrl(email: string | null | undefined): string | null {
  if (!email?.includes("@")) return null;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return null;
  return `https://www.${domain}`;
}

function collectCandidateUrls(input: ResolveWebPresenceInput, slugs: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const add = (raw: string | null | undefined, source: string) => {
    if (!raw?.trim()) return;
    const url = normalizeUrl(raw);
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(url);
  };

  add(input.website, "manual");
  for (const url of extractUrlsFromText(input.hints ?? "")) {
    add(url, "hints");
  }
  add(emailDomainUrl(input.contact_email), "email");
  for (const url of buildDomainCandidates(slugs)) {
    add(url, "domain");
  }

  return ordered.slice(0, 8);
}

function toWebPresenceResult(
  classified: ClassifiedPresence,
  url?: string
): WebPresenceResult {
  return {
    detectedWebsiteUrl: url,
    detectedWebsiteType: classified.websiteType,
    webPresenceStatus: classified.status,
    webPresenceConfidence: classified.confidence,
    webPresenceNote: classified.note,
    webPresenceEvidence: classified.evidence,
  };
}

function pickBetter(
  current: { classified: ClassifiedPresence; snapshot: WebsiteSnapshot } | null,
  next: { classified: ClassifiedPresence; snapshot: WebsiteSnapshot }
): { classified: ClassifiedPresence; snapshot: WebsiteSnapshot } {
  if (!current) return next;
  const rankA = STATUS_RANK[current.classified.status];
  const rankB = STATUS_RANK[next.classified.status];
  if (rankB > rankA) return next;
  if (rankB < rankA) return current;
  if (next.classified.confidence > current.classified.confidence) return next;
  return current;
}

/**
 * Mehrstufige Web-Presence-Erkennung mit Entity-Resolution.
 * Formulierungen bewusst vorsichtig — keine harten Existenzaussagen.
 */
export async function resolveWebPresence(
  input: ResolveWebPresenceInput
): Promise<ResolveWebPresenceOutput> {
  const variants = generateCompanyNameVariants(input.company_name);
  const candidates = collectCandidateUrls(input, variants.domainSlugs);
  const baseEvidence: WebPresenceEvidence[] = [];

  if (input.website?.trim()) {
    baseEvidence.push({
      source: "manual",
      url: normalizeUrl(input.website),
      reason: "URL im Lead hinterlegt",
      scoreImpact: 1,
    });
  }

  if (candidates.length === 0) {
    const presence: WebPresenceResult = {
      detectedWebsiteType: "none",
      webPresenceStatus: "no_reliable_web_presence",
      webPresenceConfidence: 15,
      webPresenceNote:
        "Keine belastbare öffentliche Web-Präsenz erkannt — externe Bewertbarkeit wirkt eingeschränkt. Manuelle Prüfung empfohlen.",
      webPresenceEvidence: [
        ...baseEvidence,
        {
          source: "search",
          reason: "Keine URL, kein Domain-Treffer und keine Hinweise mit Web-Bezug",
          scoreImpact: 0,
        },
      ],
    };
    return {
      presence,
      snapshot: {
        url: null,
        title: null,
        description: null,
        textSample: "",
        htmlSample: "",
        fetched: false,
        error: "Keine Kandidaten-URL",
      },
    };
  }

  let best: { classified: ClassifiedPresence; snapshot: WebsiteSnapshot } | null = null;

  for (const url of candidates) {
    const snapshot = await fetchWebsiteSnapshot(url);
    const source: WebPresenceEvidence["source"] =
      url === normalizeUrl(input.website ?? "") ? "manual" : "domain";

    const classified = classifyWebPresence({
      snapshot,
      variants,
      companyName: input.company_name,
      source,
      city: input.city,
    });

    best = pickBetter(best, { classified, snapshot });

    if (
      classified.status === "own_website_confirmed" &&
      classified.confidence >= 80 &&
      snapshot.fetched
    ) {
      break;
    }
  }

  if (!best) {
    const presence: WebPresenceResult = {
      detectedWebsiteType: "unclear",
      webPresenceStatus: "no_reliable_web_presence",
      webPresenceConfidence: 20,
      webPresenceNote:
        "URLs geprüft, aber keine belastbare Zuordnung — manuelle Prüfung empfohlen.",
      webPresenceEvidence: baseEvidence,
    };
    return {
      presence,
      snapshot: {
        url: candidates[0] ?? null,
        title: null,
        description: null,
        textSample: "",
        htmlSample: "",
        fetched: false,
        error: "Kein belastbarer Treffer",
      },
    };
  }

  const presence = toWebPresenceResult(best.classified, best.snapshot.url ?? undefined);
  presence.webPresenceEvidence = [...baseEvidence, ...presence.webPresenceEvidence];

  if (input.city && presence.webPresenceConfidence < 70) {
    presence.webPresenceEvidence.push({
      source: "search",
      matchedAddress: input.city,
      reason: `Standort ${input.city} — für manuelle Verifikation nutzbar`,
      scoreImpact: 0,
    });
  }

  return { presence, snapshot: best.snapshot };
}
