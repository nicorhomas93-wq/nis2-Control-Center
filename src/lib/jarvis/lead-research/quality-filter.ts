import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";

const EXCLUDED_DOMAINS = [
  "heise.de",
  "computerwoche.de",
  "cloudcomputing-insider.de",
  "it-business.de",
  "anwalt.de",
  "haufe.de",
  "cancom.com",
  "bitkom.org",
  "golem.de",
  "t3n.de",
  "channelpartner.de",
  "security-insider.de",
  "datenschutz-notizen.de",
  "datenschutz-praxis.de",
  "news.google.com",
  "google.com",
  "wikipedia.org",
];

const EXCLUDED_GENERIC_PATTERNS = [
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
  /\b(artikel|blog|ratgeber|kanzlei|gastbeitrag)\b.*\bnis2\b/i,
  /workshop.*nis2/i,
  /seminar.*nis2/i,
];

const CONCRETE_DEMAND_PATTERNS = [
  /\bwir (suchen|stellen ein|bieten|führen ein|bauen auf|bereiten uns vor)\b/i,
  /\bstellenanzeige\b/i,
  /\bstellenangebot\b/i,
  /\bausschreibung\b/i,
  /\bvergabe\b/i,
  /informationssicherheitsbeauftragter/i,
  /\bisb\b/i,
  /it[\s-]*security[\s-]*manager/i,
  /cyber[\s-]*security[\s-]*manager/i,
  /compliance[\s-]*manager/i,
  /iso[\s-]*27001/i,
  /\bisms\b/i,
  /\bciso\b/i,
  /nis2[\s-]*umsetzung/i,
  /isms[\s-]*aufbau/i,
  /bsi[\s-]*grundschutz/i,
  /incident[\s-]*response/i,
  /security awareness/i,
  /notfallmanagement/i,
  /lieferantensicherheit/i,
];

const PARTNER_PATTERNS = [
  /nis2[\s-]*(beratung|consulting|dienstleistung)/i,
  /iso[\s-]*27001[\s-]*(beratung|consulting)/i,
  /isms[\s-]*(beratung|consulting)/i,
  /managed[\s-]*security/i,
  /\bmsp\b/i,
  /it[\s-]*systemhaus/i,
  /datenschutz[\s-]*(beratung|consulting)/i,
  /wir (unterstützen|begleiten) (unsere )?kunden/i,
  /für (unsere )?kunden.*nis2/i,
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function extractHostname(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isExcludedMediaSource(url: string | null | undefined, companyName: string): boolean {
  const host = extractHostname(url);
  if (EXCLUDED_DOMAINS.some((d) => host.includes(d))) return true;

  const company = normalize(companyName);
  const mediaNames = [
    "heise",
    "computerwoche",
    "haufe",
    "bitkom",
    "cancom",
    "cloudcomputing",
    "it-business",
    "golem",
    "channel partner",
  ];
  return mediaNames.some((m) => company.includes(m));
}

export function isGenericNewsContent(text: string): boolean {
  const n = normalize(text);
  return EXCLUDED_GENERIC_PATTERNS.some((p) => p.test(n));
}

export function hasConcreteDemandSignal(
  text: string,
  signalType: ResearchSignalType
): boolean {
  if (signalType === "job" || signalType === "tender") return true;

  const n = normalize(text);
  return CONCRETE_DEMAND_PATTERNS.some((p) => p.test(n));
}

export function isPartnerLeadSignal(text: string, industry?: string | null): boolean {
  const combined = normalize(`${text} ${industry ?? ""}`);
  return PARTNER_PATTERNS.some((p) => p.test(combined));
}

export interface QualityCheckInput {
  company_name: string;
  signal_type: ResearchSignalType;
  title?: string | null;
  description?: string | null;
  source_url?: string | null;
  source_platform?: string | null;
}

export function rejectLeadQuality(input: QualityCheckInput): string | null {
  const combined = [input.title, input.description, input.company_name].filter(Boolean).join(" ");

  if (input.source_platform === "Google News") {
    return "Presse-/Newsquelle — kein konkretes Organisations-Bedarfssignal";
  }

  if (isExcludedMediaSource(input.source_url, input.company_name)) {
    return "Medien-/Ratgeberquelle ausgeschlossen";
  }

  if (isGenericNewsContent(combined)) {
    return "Allgemeiner NIS2-Ratgeber/News — kein konkreter Bedarf";
  }

  if (!hasConcreteDemandSignal(combined, input.signal_type)) {
    return "Kein konkretes Bedarfssignal erkennbar";
  }

  return null;
}
