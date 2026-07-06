import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";

/** Bekannte Nachrichten-, Ratgeber- und Magazin-Domains */
export const BLOCKED_MEDIA_DOMAINS = [
  "news.google.com",
  "google.com/rss",
  "heise.de",
  "computerwoche.de",
  "cloudcomputing-insider.de",
  "it-business.de",
  "anwalt.de",
  "haufe.de",
  "golem.de",
  "t3n.de",
  "channelpartner.de",
  "security-insider.de",
  "datenschutz-notizen.de",
  "datenschutz-praxis.de",
  "boerse-express.com",
  "borncity.com",
  "ad-hoc-news.de",
  "finanzen.net",
  "wallstreet-online.de",
  "handelsblatt.com",
  "faz.net",
  "spiegel.de",
  "zeit.de",
  "tagesschau.de",
  "manager-magazin.de",
  "wiwo.de",
  "focus.de",
  "chip.de",
  "netzwelt.de",
  "wikipedia.org",
  "bitkom.org",
] as const;

const BLOCKED_MEDIA_NAMES = [
  "google news",
  "heise",
  "computerwoche",
  "haufe",
  "cloudcomputing-insider",
  "cloudcomputing insider",
  "it-business",
  "anwalt.de",
  "börse express",
  "boerse express",
  "borncity",
  "born city",
  "ad hoc news",
  "finanzen.net",
  "handelsblatt",
  "manager magazin",
  "golem",
  "channel partner",
] as const;

const BLOCKED_URL_PATHS = [
  /\/(news|blog|magazin|ratgeber|artikel|presse|meinung|gastbeitrag)\//i,
];

const BLOCKED_SOURCE_PLATFORMS = [
  "google news",
  "google-news",
  "news.google",
] as const;

const GENERIC_NEWS_PATTERNS = [
  /was bedeutet nis2/i,
  /nis2 wird wichtig/i,
  /unternehmen müssen handeln/i,
  /warum nis2/i,
  /nis2.*jetzt relevant/i,
  /nis2.*erklärt/i,
  /nis2.*ratgeber/i,
  /nis2.*leitfaden/i,
  /nis2.*webinar/i,
  /nis2.*whitepaper/i,
  /\bnis2\b.*\b(artikel|blog|news|pressemitteilung)\b/i,
  /\b(artikel|blog|ratgeber|kanzlei|gastbeitrag|magazin)\b.*\bnis2\b/i,
  /workshop.*nis2/i,
  /seminar.*nis2/i,
  /\d{1,3}[.\s]?\d{3}\s*(deutsche\s+)?unternehmen/i,
  /müssen (bis|ab|bis zum).*(handeln|vorgeben|umsetzen)/i,
  /risikoanalysen vorlegen/i,
  /was nis2 für unternehmen bedeutet/i,
];

export interface MediaBlockLeadInput {
  company_name: string;
  signal_type?: ResearchSignalType | string | null;
  title?: string | null;
  description?: string | null;
  source_url?: string | null;
  source_platform?: string | null;
  signal_art?: string | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function extractHostname(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostnameMatchesBlockedDomain(host: string): boolean {
  if (!host) return false;
  return BLOCKED_MEDIA_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

export function isGenericNewsContent(text: string): boolean {
  const n = normalize(text);
  return GENERIC_NEWS_PATTERNS.some((p) => p.test(n));
}

/**
 * Harte Ausschlussregel VOR dem Scoring.
 * true = Nachrichtenportal / Ratgeber / Google News → kein Lead.
 */
export function isBlockedMediaSource(lead: MediaBlockLeadInput): boolean {
  const platform = normalize(lead.source_platform ?? "");
  const url = (lead.source_url ?? "").toLowerCase();
  const host = extractHostname(lead.source_url);
  const signalArt = normalize(lead.signal_art ?? "");
  const combined = normalize(
    [lead.company_name, lead.title, lead.description, lead.source_platform, lead.source_url]
      .filter(Boolean)
      .join(" ")
  );

  if (BLOCKED_SOURCE_PLATFORMS.some((p) => platform.includes(p))) return true;
  if (combined.includes("google news") || url.includes("news.google")) return true;
  if (signalArt.includes("unternehmensmeldung") && url.includes("news.google")) return true;

  if (hostnameMatchesBlockedDomain(host)) return true;
  if (BLOCKED_MEDIA_DOMAINS.some((d) => url.includes(d))) return true;

  if (BLOCKED_URL_PATHS.some((p) => p.test(url))) return true;

  if (BLOCKED_MEDIA_NAMES.some((name) => combined.includes(name))) return true;

  return isGenericNewsContent(combined);
}

/** Erlaubte Vergabe-Domains — ohne diese kein Tender-Score 90+. */
export const TRUSTED_TENDER_DOMAINS = [
  "service.bund.de",
  "oeffentlichevergabe.de",
  "ted.europa.eu",
  "subreport.de",
  "dtad.de",
  "evergabe-online.de",
  "evergabe.de",
  "vergabe24.de",
  "vergabemarktplatz",
  "deutsche-evergabe.de",
] as const;

export const TRUSTED_JOB_DOMAINS = [
  "stepstone.de",
  "indeed.com",
  "indeed.de",
  "arbeitsagentur.de",
  "xing.com",
  "linkedin.com",
  "karriere.",
  "jobs.",
] as const;

export function isTrustedTenderSource(
  sourceUrl: string | null | undefined,
  sourcePlatform: string | null | undefined
): boolean {
  const host = extractHostname(sourceUrl);
  const url = (sourceUrl ?? "").toLowerCase();
  const platform = normalize(sourcePlatform ?? "");

  if (TRUSTED_TENDER_DOMAINS.some((d) => host.includes(d) || url.includes(d))) return true;
  if (platform.includes("bund.de") || platform.includes("oeffentlichevergabe")) return true;
  if (platform.includes("ted") || platform.includes("dtad") || platform.includes("subreport")) {
    return true;
  }
  if (platform.includes("evergabe") || platform.includes("vergabe24")) return true;

  return false;
}

export function isTrustedJobSource(
  sourceUrl: string | null | undefined,
  sourcePlatform: string | null | undefined
): boolean {
  const host = extractHostname(sourceUrl);
  const url = (sourceUrl ?? "").toLowerCase();
  const platform = normalize(sourcePlatform ?? "");

  if (TRUSTED_JOB_DOMAINS.some((d) => host.includes(d) || url.includes(d))) return true;
  if (platform.includes("stepstone") || platform.includes("arbeitsagentur")) return true;
  if (platform.includes("indeed") || platform.includes("linkedin") || platform.includes("xing")) {
    return true;
  }

  return false;
}

export function hasTenderProcurementMarkers(text: string): boolean {
  const n = normalize(text);
  return (
    /vergabestelle/.test(n) ||
    /auftraggeber/.test(n) ||
    /öffentliche ausschreibung/.test(n) ||
    /bekanntmachung/.test(n) ||
    /leistungsbeschreibung/.test(n) ||
    (/ausschreibung/.test(n) && /vergabe/.test(n))
  );
}

const JOB_ROLE_PATTERNS = [
  /informationssicherheitsbeauftragter/i,
  /\bisb\b/i,
  /\bciso\b/i,
  /it[\s-]*security/i,
  /cyber[\s-]*security/i,
  /compliance[\s-]*manager/i,
  /isms[\s-]*manager/i,
  /iso[\s-]*27001/i,
  /security[\s-]*officer/i,
  /business continuity/i,
  /ot[\s-]*security/i,
  /\bdora\b/i,
];

export function hasJobRoleMarkers(text: string): boolean {
  const n = normalize(text);
  return JOB_ROLE_PATTERNS.some((p) => p.test(n)) || /stellenangebot/i.test(n);
}
