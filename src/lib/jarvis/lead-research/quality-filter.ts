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
  /\b(artikel|blog|ratgeber|kanzlei|gastbeitrag|magazin)\b.*\bnis2\b/i,
  /workshop.*nis2/i,
  /seminar.*nis2/i,
  /\d{1,3}[.\s]?\d{3}\s*(deutsche\s+)?unternehmen/i,
  /müssen (bis|ab|bis zum).*(handeln|vorgeben|umsetzen)/i,
  /risikoanalysen vorlegen/i,
  /was nis2 für unternehmen bedeutet/i,
];

const CONCRETE_DEMAND_PATTERNS = [
  /\bwir (suchen|stellen ein|bieten|führen ein|bauen auf|bereiten uns vor|erweitern|professionalisieren)\b/i,
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
  /nis2[\s-]*(umsetzung|compliance)/i,
  /isms[\s-]*aufbau/i,
  /bsi[\s-]*grundschutz/i,
  /incident[\s-]*response/i,
  /security awareness/i,
  /notfallmanagement/i,
  /lieferantensicherheit/i,
  /ot[\s-]*security/i,
  /\bdora\b/i,
  /business continuity/i,
  /\bbcm\b/i,
  /it[\s-]*governance/i,
  /it[\s-]*asset[\s-]*management/i,
  /security officer/i,
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
  /externer informationssicherheitsbeauftragter/i,
];

const KNOWN_PARTNER_ORGANIZATIONS = [
  "bechtle",
  "cancom",
  "datagroup",
  "gisa",
  "adesso",
  "t-systems",
  "msg systems",
  "msg group",
  "itelligence",
  "detecon",
  "norcom",
  "matrix42",
  "controlware",
  "konica minolta",
  "computacenter",
  "softwareone",
  "accenture",
  "deloitte",
  "kpmg",
  "pwc",
  "ey ",
  "ernst & young",
];

const MEDIA_COMPANY_NAMES = [
  "heise",
  "computerwoche",
  "haufe",
  "bitkom",
  "cancom",
  "cloudcomputing",
  "it-business",
  "golem",
  "channel partner",
  "börse express",
  "boerse express",
  "borncity",
  "ad hoc news",
  "finanzen.net",
  "handelsblatt",
  "manager magazin",
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
  return MEDIA_COMPANY_NAMES.some((m) => company.includes(m));
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

/** NIS2-Erwähnung ohne Rollen-, Projekt- oder Ausschreibungsbezug ist kein Lead. */
export function isNis2MentionOnly(text: string, signalType: ResearchSignalType): boolean {
  const n = normalize(text);
  if (!/\bnis2\b/.test(n)) return false;
  if (signalType === "job" || signalType === "tender") return false;

  const beyondNis2 = CONCRETE_DEMAND_PATTERNS.filter((p) => !/nis2/.test(p.source)).some((p) =>
    p.test(n)
  );
  return !beyondNis2;
}

export function isPartnerLeadSignal(text: string, industry?: string | null): boolean {
  const combined = normalize(`${text} ${industry ?? ""}`);
  return PARTNER_PATTERNS.some((p) => p.test(combined));
}

export function isKnownPartnerOrganization(
  companyName: string,
  industry?: string | null,
  text?: string
): boolean {
  const combined = normalize(`${companyName} ${industry ?? ""} ${text ?? ""}`);

  if (KNOWN_PARTNER_ORGANIZATIONS.some((name) => combined.includes(name))) return true;

  const partnerIndustry = [
    "it-systemhaus",
    "systemhaus",
    "msp",
    "managed service",
    "it-dienstleister",
    "beratung",
    "consulting",
    "cybersecurity-beratung",
  ];
  const industryNorm = normalize(industry ?? "");
  if (partnerIndustry.some((k) => industryNorm.includes(k))) return true;

  return /it[\s-]*consultant|junior consultant|senior consultant/.test(combined) && /\bnis2\b/.test(combined);
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
    return "Nachrichtenportal / allgemeiner Artikel";
  }

  if (isExcludedMediaSource(input.source_url, input.company_name)) {
    return "Nachrichtenportal / Medienquelle ausgeschlossen";
  }

  if (isGenericNewsContent(combined)) {
    return "Allgemeiner NIS2-Artikel ohne konkrete Organisation";
  }

  if (isNis2MentionOnly(combined, input.signal_type)) {
    return "Nur NIS2-Erwähnung ohne konkretes Bedarfssignal";
  }

  if (!hasConcreteDemandSignal(combined, input.signal_type)) {
    return "Kein konkretes Bedarfssignal erkennbar";
  }

  return null;
}
