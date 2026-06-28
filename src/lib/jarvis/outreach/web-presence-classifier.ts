import type { WebsiteSnapshot } from "@/lib/jarvis/outreach/website-snapshot";
import {
  generateCompanyNameVariants,
  nameAppearsInText,
  type CompanyNameVariants,
} from "@/lib/jarvis/outreach/company-name-normalizer";
import type {
  DetectedWebsiteType,
  WebPresenceEvidence,
  WebPresenceStatus,
} from "@/lib/jarvis/outreach/web-presence-types";

const DIRECTORY_HOSTS = [
  "northdata.de",
  "gelbeseiten.de",
  "wlw.de",
  "implisense.com",
  "firmenwissen.eu",
  "firmenabc.com",
  "unternehmensregister.de",
  "linkedin.com",
  "xing.com",
  "facebook.com",
  "kununu.com",
  "google.com",
  "maps.google",
  "11880.com",
  "dastelefonbuch.de",
  "creditreform.de",
  "hoppenstedt.de",
];

const GROUP_KEYWORDS = [
  "konzern",
  "unternehmensgruppe",
  "gruppe",
  "holding",
  "dachmarke",
  "markenwelt",
  "tochtergesellschaft",
  "tochterunternehmen",
  "muttergesellschaft",
  "verbund",
  "konzernbereich",
];

const BRAND_KEYWORDS = ["marke", "brand", "dachmarke", "markenfamilie"];

export interface ClassifiedPresence {
  websiteType: DetectedWebsiteType;
  status: WebPresenceStatus;
  confidence: number;
  note: string;
  evidence: WebPresenceEvidence[];
  nameMatchScore: number;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isDirectoryHost(host: string): boolean {
  return DIRECTORY_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

function isMapsUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("google.com/maps") || lower.includes("maps.google");
}

function extractImpressumSnippet(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const idx = text.toLowerCase().indexOf("impressum");
  if (idx >= 0) return text.slice(idx, idx + 800);
  return "";
}

export function classifyWebPresence(input: {
  snapshot: WebsiteSnapshot;
  variants: CompanyNameVariants;
  companyName: string;
  source: WebPresenceEvidence["source"];
  city?: string | null;
}): ClassifiedPresence {
  const evidence: WebPresenceEvidence[] = [];
  const url = input.snapshot.url ?? "";
  const host = hostFromUrl(url);

  if (!input.snapshot.fetched) {
    evidence.push({
      source: input.source,
      url: url || undefined,
      reason: input.snapshot.error
        ? `URL nicht erreichbar (${input.snapshot.error}) — keine belastbare Bestätigung`
        : "Keine URL geprüft",
      scoreImpact: -5,
    });
    return {
      websiteType: "unclear",
      status: "unclear_presence",
      confidence: 25,
      note: "Hinterlegte oder vermutete URL konnte nicht verifiziert werden — manuelle Prüfung empfohlen.",
      evidence,
      nameMatchScore: 0,
    };
  }

  const pageText = [
    input.snapshot.title ?? "",
    input.snapshot.description ?? "",
    input.snapshot.textSample,
  ].join(" ");

  const nameMatch = nameAppearsInText(pageText, input.variants);
  const impressumSnippet = extractImpressumSnippet(input.snapshot.textSample);
  const impressumMatch = impressumSnippet
    ? nameAppearsInText(impressumSnippet, input.variants)
    : { matched: false, score: 0 };

  if (impressumMatch.matched) {
    evidence.push({
      source: "impressum",
      url,
      snippet: impressumSnippet.slice(0, 200),
      matchedName: impressumMatch.matchedName,
      reason: "Firmenname wirkt im Impressum-Bereich erkennbar",
      scoreImpact: 4,
    });
  }

  if (isDirectoryHost(host) || isMapsUrl(url)) {
    evidence.push({
      source: isMapsUrl(url) ? "maps" : "directory",
      url,
      title: input.snapshot.title ?? undefined,
      matchedName: nameMatch.matchedName,
      reason: "Eintrag wirkt wie Verzeichnis/Maps — keine eigene Unternehmenswebsite",
      scoreImpact: nameMatch.matched ? 2 : 0,
    });
    return {
      websiteType: "directory_only",
      status: "directory_presence_only",
      confidence: nameMatch.matched ? 55 : 35,
      note: "Öffentlich wirkt nur ein Verzeichnis- oder Maps-Eintrag erkennbar — eigene Website nicht eindeutig zuordenbar.",
      evidence,
      nameMatchScore: nameMatch.score,
    };
  }

  const lowerText = pageText.toLowerCase();
  const hasGroup = GROUP_KEYWORDS.some((kw) => lowerText.includes(kw));
  const hasBrand = BRAND_KEYWORDS.some((kw) => lowerText.includes(kw));

  if (nameMatch.matched && impressumMatch.matched) {
    evidence.push({
      source: input.source,
      url,
      title: input.snapshot.title ?? undefined,
      matchedName: nameMatch.matchedName,
      reason: "Firmenname wirkt auf Seite und im Impressum konsistent",
      scoreImpact: 5,
    });
    return {
      websiteType: "own_website",
      status: "own_website_confirmed",
      confidence: 88,
      note: "Eigene Web-Präsenz wirkt wahrscheinlich — Name erscheint auf der Seite und im Impressum.",
      evidence,
      nameMatchScore: nameMatch.score + impressumMatch.score,
    };
  }

  if (nameMatch.matched && !hasGroup) {
    evidence.push({
      source: input.source,
      url,
      title: input.snapshot.title ?? undefined,
      matchedName: nameMatch.matchedName,
      reason: "Firmenname wirkt auf der Seite erkennbar",
      scoreImpact: 3,
    });
    return {
      websiteType: "own_website",
      status: "own_website_confirmed",
      confidence: 72,
      note: "Eigene Website wirkt wahrscheinlich — Firmenbezug erkennbar, Impressum nicht eindeutig geprüft.",
      evidence,
      nameMatchScore: nameMatch.score,
    };
  }

  if (hasGroup || hasBrand) {
    evidence.push({
      source: input.source,
      url,
      title: input.snapshot.title ?? undefined,
      matchedName: nameMatch.matchedName,
      reason: hasGroup
        ? "Seite wirkt wie Konzern-/Gruppenpräsenz"
        : "Seite wirkt wie Dachmarken-Präsenz",
      scoreImpact: nameMatch.matched ? 3 : 1,
    });
    return {
      websiteType: hasBrand && !hasGroup ? "brand_website" : "group_website",
      status: "group_or_brand_presence",
      confidence: nameMatch.matched ? 65 : 45,
      note: "Web-Präsenz wirkt über Konzern, Gruppe oder Dachmarke — Zuordnung zur Einheit nicht eindeutig.",
      evidence,
      nameMatchScore: nameMatch.score,
    };
  }

  if (nameMatch.matched) {
    evidence.push({
      source: input.source,
      url,
      matchedName: nameMatch.matchedName,
      reason: "Teilweise Namensübereinstimmung — Zuordnung unklar",
      scoreImpact: 2,
    });
    return {
      websiteType: "unclear",
      status: "unclear_presence",
      confidence: 48,
      note: "Web-Präsenz mit Namensbezug erkannt — Zuordnung zur Lead-Einheit nicht eindeutig, manuelle Prüfung empfohlen.",
      evidence,
      nameMatchScore: nameMatch.score,
    };
  }

  evidence.push({
    source: input.source,
    url,
    title: input.snapshot.title ?? undefined,
    reason: "Seite erreichbar, aber kein klarer Firmenbezug erkennbar",
    scoreImpact: 0,
  });

  return {
    websiteType: "unclear",
    status: "unclear_presence",
    confidence: 30,
    note: "URL erreichbar, aber kein eindeutiger Firmenbezug erkennbar — manuelle Prüfung empfohlen.",
    evidence,
    nameMatchScore: 0,
  };
}
