import { TENDER_KEYWORDS } from "@/lib/jarvis/lead-research/constants";
import { matchesAutomatedResearchText } from "@/lib/jarvis/lead-research/fetchers/keyword-match";
import type { FetcherResult, ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";
import { isBlockedResearchCandidate } from "@/lib/jarvis/lead-research/candidate-block";
import { fetchText } from "@/lib/jarvis/lead-research/scrapers/http";
import { parseRss } from "@/lib/jarvis/lead-research/scrapers/rss";

const SOURCE_PLATFORM = "bund.de";

const SEARCH_KEYWORDS = [
  "NIS2",
  "Informationssicherheit",
  "ISO 27001",
  "ISMS",
  "Cybersecurity",
  "Informationssicherheitsbeauftragter",
] as const;

function bundSearchRssUrl(keyword: string): string {
  const params = new URLSearchParams({
    nn: "4641482",
    searchText: keyword,
    resultsPerPage: "100",
    sortOrder: "dateOfIssue_dt desc",
    jobsrss: "true",
  });
  return `https://www.service.bund.de/Content/DE/Ausschreibungen/Suche/Formular.html?${params}`;
}

function extractBuyer(description: string): string | null {
  const match = description.match(/Vergabestelle:\s*([^<\n]+)/i);
  return match?.[1]?.trim() ?? null;
}

function extractRegion(description: string): string | null {
  const match = description.match(/Erfüllungsort:\s*([^<\n]+)/i);
  return match?.[1]?.trim() ?? null;
}

function toCandidate(item: ReturnType<typeof parseRss>[number]): ResearchCandidate | null {
  const combined = `${item.title} ${item.description}`;
  if (!matchesAutomatedResearchText(combined, "tender")) return null;

  const company = extractBuyer(item.description) ?? "Öffentlicher Auftraggeber";
  const externalId = item.guid || item.link;

  const candidate: ResearchCandidate = {
    company_name: company,
    signal_type: "tender",
    source_platform: SOURCE_PLATFORM,
    source_url: item.link.split("#")[0],
    external_id: externalId,
    title: item.title,
    description: item.description.slice(0, 2000),
    region: extractRegion(item.description),
    industry: "öffentlich",
  };

  if (isBlockedResearchCandidate(candidate)) return null;

  return candidate;
}

async function fetchKeywordFeed(keyword: string): Promise<{
  scanned: number;
  matched: ResearchCandidate[];
  error?: string;
}> {
  const { ok, status, text } = await fetchText(bundSearchRssUrl(keyword), {
    accept: "application/rss+xml, application/xml, text/xml, */*",
  });

  if (!ok) {
    return { scanned: 0, matched: [], error: `bund.de RSS „${keyword}“: HTTP ${status}` };
  }

  const items = parseRss(text);
  const matched = items
    .map((item) => toCandidate(item))
    .filter((item): item is ResearchCandidate => item !== null);

  return { scanned: items.length, matched };
}

export async function fetchServiceBundSignals(): Promise<FetcherResult> {
  const errors: string[] = [];
  const matched: ResearchCandidate[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  const global = await fetchText(
    "https://www.service.bund.de/Content/Globals/Functions/RSSFeed/RSSGenerator_Ausschreibungen.xml",
    { accept: "application/rss+xml, application/xml, text/xml, */*", timeoutMs: 90_000 }
  );

  if (global.ok) {
    const items = parseRss(global.text);
    scanned += items.length;
    for (const item of items) {
      const candidate = toCandidate(item);
      if (!candidate || seen.has(candidate.external_id)) continue;
      seen.add(candidate.external_id);
      matched.push(candidate);
    }
  } else {
    errors.push(`bund.de Gesamt-RSS: HTTP ${global.status}`);
  }

  for (const keyword of SEARCH_KEYWORDS) {
    if (!TENDER_KEYWORDS.some((k) => k.toLowerCase() === keyword.toLowerCase())) continue;
    const result = await fetchKeywordFeed(keyword);
    scanned += result.scanned;
    if (result.error) errors.push(result.error);
    for (const candidate of result.matched) {
      if (seen.has(candidate.external_id)) continue;
      seen.add(candidate.external_id);
      matched.push(candidate);
    }
  }

  return { scanned, matched, errors };
}
