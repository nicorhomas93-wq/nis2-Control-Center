import { ANNOUNCEMENT_KEYWORDS } from "@/lib/jarvis/lead-research/constants";
import { matchesAutomatedResearchText } from "@/lib/jarvis/lead-research/fetchers/keyword-match";
import type { FetcherResult, ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";
import { fetchText } from "@/lib/jarvis/lead-research/scrapers/http";
import { parseRss } from "@/lib/jarvis/lead-research/scrapers/rss";

const SOURCE_PLATFORM = "Google News";

const NEWS_QUERIES = [
  "NIS2 Unternehmen Deutschland",
  "ISO 27001 Zertifizierung Unternehmen",
  "Informationssicherheit Unternehmen Deutschland",
  "Cybersecurity Compliance Deutschland",
] as const;

function newsRssUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: "de",
    gl: "DE",
    ceid: "DE:de",
  });
  return `https://news.google.com/rss/search?${params}`;
}

function extractPublisher(title: string): string {
  const parts = title.split(" - ");
  if (parts.length >= 2) return parts[parts.length - 1].trim();
  return "Unbekannt";
}

function cleanTitle(title: string): string {
  const parts = title.split(" - ");
  if (parts.length >= 2) return parts.slice(0, -1).join(" - ").trim();
  return title.trim();
}

export async function fetchGoogleNewsSignals(): Promise<FetcherResult> {
  const errors: string[] = [];
  const matched: ResearchCandidate[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  for (const query of NEWS_QUERIES) {
    try {
      const { ok, status, text } = await fetchText(newsRssUrl(query), {
        accept: "application/rss+xml, application/xml, text/xml, */*",
      });

      if (!ok) {
        errors.push(`Google News „${query}“: HTTP ${status}`);
        continue;
      }

      const items = parseRss(text);
      scanned += items.length;

      for (const item of items) {
        const combined = `${item.title} ${item.description}`;
        if (!matchesAutomatedResearchText(combined)) continue;

        const hasAnnouncementKeyword = ANNOUNCEMENT_KEYWORDS.some((kw) =>
          combined.toLowerCase().includes(kw.toLowerCase())
        );
        if (!hasAnnouncementKeyword && !/nis2|iso\s*27001/i.test(combined)) continue;

        const externalId = item.guid || item.link;
        if (seen.has(externalId)) continue;
        seen.add(externalId);

        const publisher = extractPublisher(item.title);
        matched.push({
          company_name: publisher,
          signal_type: "announcement",
          source_platform: SOURCE_PLATFORM,
          source_url: item.link,
          external_id: externalId,
          title: cleanTitle(item.title),
          description: item.description.slice(0, 2000),
          region: "Deutschland",
          industry: null,
        });
      }
    } catch (err) {
      errors.push(
        err instanceof Error ? `Google News „${query}“: ${err.message}` : `Google News „${query}“: Fehler`
      );
    }
  }

  return { scanned, matched, errors };
}
