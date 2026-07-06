import type { FetcherResult } from "@/lib/jarvis/lead-research/fetchers/types";
import { fetchCommercialPlatformSignals } from "@/lib/jarvis/lead-research/scrapers/commercial-platforms";
import { fetchGoogleNewsSignals } from "@/lib/jarvis/lead-research/scrapers/google-news";
import { fetchServiceBundSignals } from "@/lib/jarvis/lead-research/scrapers/service-bund";
import { fetchStepstoneSignals } from "@/lib/jarvis/lead-research/scrapers/stepstone";

export interface ScrapedSignalsBundle {
  tenders: FetcherResult;
  jobs: FetcherResult;
  announcements: FetcherResult;
}

function mergeResults(results: FetcherResult[]): FetcherResult {
  const matched = [];
  const errors: string[] = [];
  let scanned = 0;
  const seen = new Set<string>();

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

export async function fetchScrapedSignals(): Promise<ScrapedSignalsBundle> {
  const [serviceBund, commercial, stepstone, googleNews] = await Promise.all([
    fetchServiceBundSignals(),
    fetchCommercialPlatformSignals(),
    fetchStepstoneSignals(),
    fetchGoogleNewsSignals(),
  ]);

  return {
    tenders: mergeResults([serviceBund, commercial]),
    jobs: stepstone,
    announcements: googleNews,
  };
}
