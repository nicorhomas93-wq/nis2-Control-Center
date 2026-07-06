import { matchesAutomatedResearchText } from "@/lib/jarvis/lead-research/fetchers/keyword-match";
import type { FetcherResult, ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";

const SOURCE_PLATFORM = "DTAD";
const TED_SEARCH_URL = "https://api.ted.europa.eu/v3/notices/search";

const TED_QUERIES = [
  'buyer-country=DEU AND publication-date>=20250601 AND (FT~"NIS2" OR FT~"information security" OR FT~"ISO 27001" OR FT~"cybersecurity" OR FT~"ISMS")',
  'buyer-country=DEU AND publication-date>=20250601 AND classification-cpv=72000000',
] as const;

interface TedNotice {
  ND?: string;
  "publication-number"?: string;
  TI?: Record<string, string>;
  "buyer-name"?: Record<string, string[]>;
  links?: { html?: Record<string, string> };
}

interface TedSearchResponse {
  notices?: TedNotice[];
  totalNoticeCount?: number;
}

function pickGermanText(map?: Record<string, string | string[]>): string {
  if (!map) return "";
  const value = map.deu ?? map.eng ?? Object.values(map)[0];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function noticeUrl(notice: TedNotice): string {
  const links = notice.links?.html;
  if (links?.deu) return links.deu;
  if (links?.eng) return links.eng;
  const id = notice.ND ?? notice["publication-number"];
  return id ? `https://ted.europa.eu/de/notice/-/detail/${id}` : "https://ted.europa.eu/";
}

export async function fetchDtadTedSignals(): Promise<FetcherResult> {
  const errors: string[] = [];
  const matched: ResearchCandidate[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  for (const query of TED_QUERIES) {
    try {
      const response = await fetch(TED_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          query,
          limit: 50,
          fields: ["ND", "TI", "buyer-name", "links"],
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!response.ok) {
        errors.push(`DTAD/TED API: HTTP ${response.status}`);
        continue;
      }

      const data = (await response.json()) as TedSearchResponse;
      const notices = data.notices ?? [];
      scanned += notices.length;

      for (const notice of notices) {
        const title = pickGermanText(notice.TI);
        const buyer = pickGermanText(notice["buyer-name"]);
        const combined = `${title} ${buyer}`;
        if (!title || !matchesAutomatedResearchText(combined, "tender")) continue;

        const id = notice.ND ?? notice["publication-number"] ?? title;
        const externalId = `ted-${id}`;
        if (seen.has(externalId)) continue;
        seen.add(externalId);

        matched.push({
          company_name: buyer || "EU-Auftraggeber",
          signal_type: "tender",
          source_platform: SOURCE_PLATFORM,
          source_url: noticeUrl(notice),
          external_id: externalId,
          title,
          description: `TED/EU-Vergabe · ${buyer}`.slice(0, 2000),
          region: "Deutschland",
          industry: "öffentlich",
        });
      }
    } catch (err) {
      errors.push(err instanceof Error ? `DTAD/TED API: ${err.message}` : "DTAD/TED API: Fehler");
    }
  }

  return { scanned, matched, errors };
}
