/**
 * Öffentlich ermittelte Feed-URLs (Stand: Juli 2026).
 * evergabe/Vergabe24 haben kein eigenes Tender-RSS — Bundesbekanntmachungen laufen über service.bund.de.
 * DTAD hat kein öffentliches RSS — Abdeckung über TED Search API.
 */

function bundKeywordRss(keyword: string): string {
  const params = new URLSearchParams({
    nn: "4641482",
    searchText: keyword,
    resultsPerPage: "100",
    sortOrder: "dateOfIssue_dt desc",
    jobsrss: "true",
  });
  return `https://www.service.bund.de/Content/DE/Ausschreibungen/Suche/Formular.html?${params}`;
}

function bundCategoryRss(category: string): string {
  const params = new URLSearchParams({
    nn: "4641482",
    cl2Categories_LeistungenErzeugnisse: category,
    resultsPerPage: "100",
    sortOrder: "dateOfIssue_dt desc",
    jobsrss: "true",
  });
  return `https://www.service.bund.de/Content/DE/Ausschreibungen/Suche/Formular.html?${params}`;
}

/** evergabe-online.de veröffentlicht auf service.bund.de */
export const DEFAULT_EVERGABE_RSS_FEEDS = [
  bundKeywordRss("NIS2"),
  bundKeywordRss("Informationssicherheit"),
  bundKeywordRss("ISO 27001"),
  bundKeywordRss("Cybersecurity"),
  bundKeywordRss("ISMS"),
] as const;

/** Vergabe24: kein Tender-RSS (nur Blog). IT-/Telekom-Kategorie auf bund.de als Proxy. */
export const DEFAULT_VERGABE24_RSS_FEEDS = [
  bundCategoryRss("leistung-informationstechnik"),
  bundCategoryRss("leistung-kommunikationsundelektrotechnik"),
] as const;

/** Subreport ELViS: öffentliche HTML-Einbettungen (ITK Rheinland / Neuss). */
export const DEFAULT_SUBREPORT_HTML_FEEDS = [
  "https://www.itk-rheinland.de/neuss_rss/",
  "https://www.itk-rheinland.de/fileadmin/external/neuss_rss/",
] as const;

export const PLATFORM_RSS_ENV_KEYS = {
  evergabe: "JARVIS_SCRAPER_EVERGABE_RSS",
  vergabe24: "JARVIS_SCRAPER_VERGABE24_RSS",
  dtad: "JARVIS_SCRAPER_DTAD_RSS",
  subreport: "JARVIS_SCRAPER_SUBREPORT_RSS",
} as const;

export function resolveFeedUrls(
  defaults: readonly string[],
  envKey: string
): string[] {
  const extra = process.env[envKey]?.trim();
  if (extra) return [...defaults, extra];
  return [...defaults];
}
