import { matchesAutomatedResearchText } from "@/lib/jarvis/lead-research/fetchers/keyword-match";
import type { FetcherResult, ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";
import { fetchText, stripHtml } from "@/lib/jarvis/lead-research/scrapers/http";
import { DEFAULT_SUBREPORT_HTML_FEEDS } from "@/lib/jarvis/lead-research/scrapers/rss-feeds";

const SOURCE_PLATFORM = "Subreport";

interface ParsedTender {
  title: string;
  url: string;
  buyer: string;
  region: string | null;
  elvisId: string | null;
}

function parseSubreportHtml(html: string): ParsedTender[] {
  const items: ParsedTender[] = [];
  const blocks = html.match(/<h3>[\s\S]*?<\/h3>\s*<p>[\s\S]*?<\/p>/gi) ?? [];

  for (const block of blocks) {
    const titleMatch = block.match(/<h3>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (!titleMatch) continue;

    const url = titleMatch[1].trim();
    const title = stripHtml(titleMatch[2]);
    const body = stripHtml(block);

    const buyerMatch = body.match(/Auftraggeber:\s*([^A]+?)(?:Ausschreibungsart|$)/i);
    const buyer = buyerMatch?.[1]?.trim() ?? "Öffentlicher Auftraggeber";
    const regionMatch = buyer.match(/,\s*(\d{5})\s+(.+)$/);
    const elvisMatch = url.match(/ELVISID:([A-Z0-9]+)/i);

    items.push({
      title,
      url: url.startsWith("http") ? url : `https://www.subreport-elvis.de${url}`,
      buyer,
      region: regionMatch ? `${regionMatch[2]} ${regionMatch[1]}`.trim() : null,
      elvisId: elvisMatch?.[1] ?? null,
    });
  }

  return items;
}

async function fetchHtmlFeed(url: string): Promise<{
  scanned: number;
  matched: ResearchCandidate[];
  error?: string;
}> {
  const { ok, status, text } = await fetchText(url, { timeoutMs: 30_000 });
  if (!ok) {
    return { scanned: 0, matched: [], error: `Subreport HTML ${status}: ${url}` };
  }

  const tenders = parseSubreportHtml(text);
  const matched: ResearchCandidate[] = [];

  for (const tender of tenders) {
    const combined = `${tender.title} ${tender.buyer}`;
    if (!matchesAutomatedResearchText(combined)) continue;

    matched.push({
      company_name: tender.buyer.split(",")[0]?.trim() || tender.buyer,
      signal_type: "tender",
      source_platform: SOURCE_PLATFORM,
      source_url: tender.url,
      external_id: tender.elvisId ? `elvis-${tender.elvisId}` : `subreport-${tender.url}`,
      title: tender.title,
      description: tender.buyer,
      region: tender.region,
      industry: "öffentlich",
    });
  }

  return { scanned: tenders.length, matched };
}

export async function fetchSubreportHtmlSignals(
  feedUrls: readonly string[] = DEFAULT_SUBREPORT_HTML_FEEDS
): Promise<FetcherResult> {
  const errors: string[] = [];
  const matched: ResearchCandidate[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  for (const url of feedUrls) {
    try {
      const result = await fetchHtmlFeed(url);
      scanned += result.scanned;
      if (result.error) errors.push(result.error);

      for (const candidate of result.matched) {
        if (seen.has(candidate.external_id)) continue;
        seen.add(candidate.external_id);
        matched.push(candidate);
      }
    } catch (err) {
      errors.push(
        err instanceof Error ? `Subreport HTML: ${err.message}` : `Subreport HTML: ${url}`
      );
    }
  }

  return { scanned, matched, errors };
}
