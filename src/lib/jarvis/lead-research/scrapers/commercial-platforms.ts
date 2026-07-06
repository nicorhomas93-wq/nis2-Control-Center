import type { FetcherResult, ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";
import { fetchDtadTedSignals } from "@/lib/jarvis/lead-research/scrapers/dtad-ted";
import { fetchText } from "@/lib/jarvis/lead-research/scrapers/http";
import { parseRss } from "@/lib/jarvis/lead-research/scrapers/rss";
import {
  DEFAULT_EVERGABE_RSS_FEEDS,
  DEFAULT_VERGABE24_RSS_FEEDS,
  PLATFORM_RSS_ENV_KEYS,
  resolveFeedUrls,
} from "@/lib/jarvis/lead-research/scrapers/rss-feeds";
import { fetchSubreportHtmlSignals } from "@/lib/jarvis/lead-research/scrapers/subreport-html";
import { matchesAutomatedResearchText } from "@/lib/jarvis/lead-research/fetchers/keyword-match";

interface PlatformConfig {
  platform: string;
  envKey: string;
  defaultFeeds: readonly string[];
}

const RSS_PLATFORMS: PlatformConfig[] = [
  {
    platform: "evergabe.de",
    envKey: PLATFORM_RSS_ENV_KEYS.evergabe,
    defaultFeeds: DEFAULT_EVERGABE_RSS_FEEDS,
  },
  {
    platform: "Vergabe24",
    envKey: PLATFORM_RSS_ENV_KEYS.vergabe24,
    defaultFeeds: DEFAULT_VERGABE24_RSS_FEEDS,
  },
];

function extractCompanyFromText(title: string, description: string): string {
  const auftraggeber = description.match(/Auftraggeber[:\s]+([^\n.<]{3,80})/i);
  if (auftraggeber) return auftraggeber[1].trim();

  const vergabestelle = description.match(/Vergabestelle[:\s]+([^\n.<]{3,80})/i);
  if (vergabestelle) return vergabestelle[1].trim();

  return "Öffentlicher Auftraggeber";
}

async function fetchPlatformRss(config: PlatformConfig): Promise<FetcherResult> {
  const errors: string[] = [];
  const matched: ResearchCandidate[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  const feedUrls = resolveFeedUrls(config.defaultFeeds, config.envKey);

  for (const feedUrl of feedUrls) {
    try {
      const { ok, status, text } = await fetchText(feedUrl, {
        accept: "application/rss+xml, application/xml, text/xml, */*",
      });

      if (!ok) {
        errors.push(`${config.platform} RSS HTTP ${status}`);
        continue;
      }

      const items = parseRss(text);
      scanned += items.length;

      for (const item of items) {
        const combined = `${item.title} ${item.description}`;
        if (!matchesAutomatedResearchText(combined)) continue;

        const externalId = `${config.platform}:${item.guid || item.link}`;
        if (seen.has(externalId)) continue;
        seen.add(externalId);

        matched.push({
          company_name: extractCompanyFromText(item.title, item.description),
          signal_type: "tender",
          source_platform: config.platform,
          source_url: item.link.split("#")[0],
          external_id: externalId,
          title: item.title,
          description: item.description.slice(0, 2000),
          region: null,
          industry: "öffentlich",
        });
      }
    } catch (err) {
      errors.push(
        err instanceof Error ? `${config.platform}: ${err.message}` : `${config.platform}: Fehler`
      );
    }
  }

  return { scanned, matched, errors };
}

function mergeResults(results: FetcherResult[]): FetcherResult {
  const matched: ResearchCandidate[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  for (const result of results) {
    scanned += result.scanned;
    errors.push(...result.errors);
    for (const item of result.matched) {
      const key = `${item.source_platform}|${item.external_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matched.push(item);
    }
  }

  return { scanned, matched, errors };
}

export async function fetchCommercialPlatformSignals(): Promise<FetcherResult> {
  const [evergabe, vergabe24, dtad, subreport] = await Promise.all([
    fetchPlatformRss(RSS_PLATFORMS[0]),
    fetchPlatformRss(RSS_PLATFORMS[1]),
    fetchDtadTedSignals(),
    fetchSubreportHtmlSignals(),
  ]);

  return mergeResults([evergabe, vergabe24, dtad, subreport]);
}
