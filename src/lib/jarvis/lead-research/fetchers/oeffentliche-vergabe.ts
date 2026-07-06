import JSZip from "jszip";
import { parseCsv } from "@/lib/jarvis/lead-research/csv-parse";
import { matchesAutomatedResearchText } from "@/lib/jarvis/lead-research/fetchers/keyword-match";
import type { FetcherResult, ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";

const SOURCE_PLATFORM = "oeffentlichevergabe.de";

function formatPubDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function noticeUrl(noticeIdentifier: string): string {
  return `https://www.oeffentlichevergabe.de/ui/de/search/details?noticeId=${encodeURIComponent(noticeIdentifier)}`;
}

function pickBuyer(
  organisations: Record<string, string>[],
  noticeIdentifier: string,
  noticeVersion: string
): Record<string, string> | undefined {
  const matching = organisations.filter(
    (org) =>
      org.noticeIdentifier === noticeIdentifier && org.noticeVersion === noticeVersion
  );
  return (
    matching.find((org) => org.organisationRole === "buyer") ??
    matching.find((org) => /buyer|beschaffer/i.test(org.organisationRole ?? "")) ??
    matching[0]
  );
}

export async function fetchOeffentlicheVergabeSignals(
  pubDay?: string
): Promise<FetcherResult> {
  const errors: string[] = [];
  const matched: ResearchCandidate[] = [];
  const seen = new Set<string>();

  const day = pubDay ?? formatPubDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const url = `https://oeffentlichevergabe.de/api/notice-exports?pubDay=${day}&format=csv.zip`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.bekanntmachungsservice.csv.zip+zip" },
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      return {
        scanned: 0,
        matched: [],
        errors: [`oeffentlichevergabe.de ${response.status} für ${day}`],
      };
    }

    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const purposeFile = zip.file("purpose.csv");
    const organisationFile = zip.file("organisation.csv");

    if (!purposeFile || !organisationFile) {
      return {
        scanned: 0,
        matched: [],
        errors: ["CSV-Export ohne purpose.csv oder organisation.csv"],
      };
    }

    const purposes = parseCsv(await purposeFile.async("string"));
    const organisations = parseCsv(await organisationFile.async("string"));

    for (const purpose of purposes) {
      const title = purpose.title ?? "";
      const description = purpose.description ?? "";
      const combined = `${title} ${description}`;

      if (!matchesAutomatedResearchText(combined, "tender")) continue;

      const noticeIdentifier = purpose.noticeIdentifier;
      const noticeVersion = purpose.noticeVersion;
      if (!noticeIdentifier) continue;

      const dedupeKey = `${noticeIdentifier}|${purpose.lotIdentifier ?? ""}|${noticeVersion}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const buyer = pickBuyer(organisations, noticeIdentifier, noticeVersion);
      const companyName =
        buyer?.organisationName?.trim() ||
        title.split(/[-–—]/)[0]?.trim() ||
        "Öffentlicher Auftraggeber";

      const region = [buyer?.organisationCity, buyer?.organisationPostCode]
        .filter(Boolean)
        .join(" ")
        .trim();

      matched.push({
        company_name: companyName,
        signal_type: "tender",
        source_platform: SOURCE_PLATFORM,
        source_url: noticeUrl(noticeIdentifier),
        external_id: dedupeKey,
        title: title.trim(),
        description: description.trim().slice(0, 2000),
        region: region || null,
        industry: buyer?.organisationInternetAddress ? "öffentlich" : null,
      });
    }

    return { scanned: purposes.length, matched, errors };
  } catch (err) {
    errors.push(
      err instanceof Error ? `oeffentlichevergabe.de: ${err.message}` : "oeffentlichevergabe.de: Unbekannter Fehler"
    );
    return { scanned: 0, matched, errors };
  }
}
