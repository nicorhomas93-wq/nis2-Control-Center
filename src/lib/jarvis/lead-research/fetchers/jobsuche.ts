import { JOB_KEYWORDS } from "@/lib/jarvis/lead-research/constants";
import { matchesAutomatedResearchText } from "@/lib/jarvis/lead-research/fetchers/keyword-match";
import type { FetcherResult, ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";

const SOURCE_PLATFORM = "arbeitsagentur.de";
const API_BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs";

interface JobListing {
  stellenangebotsTitel?: string;
  firma?: string;
  referenznummer?: string;
  hauptberuf?: string;
  alleBerufe?: string[];
  stellenlokationen?: Array<{
    adresse?: { ort?: string; plz?: string; region?: string };
  }>;
}

interface JobSearchResponse {
  maxErgebnisse?: number;
  ergebnisliste?: JobListing[];
}

function jobUrl(referenznummer: string): string {
  return `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(referenznummer)}`;
}

function buildDescription(job: JobListing): string {
  const parts = [
    job.hauptberuf,
    ...(job.alleBerufe ?? []),
    job.stellenangebotsTitel,
  ].filter(Boolean);
  return [...new Set(parts)].join(" · ");
}

async function searchJobs(keyword: string): Promise<JobListing[]> {
  const params = new URLSearchParams({
    was: keyword,
    size: "25",
    page: "1",
  });

  const response = await fetch(`${API_BASE}?${params}`, {
    headers: {
      "X-API-Key": "jobboerse-jobsuche",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Jobsuche ${response.status} für „${keyword}"`);
  }

  const data = (await response.json()) as JobSearchResponse;
  return data.ergebnisliste ?? [];
}

export async function fetchJobsucheSignals(): Promise<FetcherResult> {
  const errors: string[] = [];
  const matched: ResearchCandidate[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  const keywords = [...new Set(JOB_KEYWORDS.map((k) => k.trim()).filter(Boolean))];

  for (const keyword of keywords) {
    try {
      const jobs = await searchJobs(keyword);
      scanned += jobs.length;

      for (const job of jobs) {
        const referenznummer = job.referenznummer?.trim();
        const title = job.stellenangebotsTitel?.trim() ?? "";
        const company = job.firma?.trim();

        if (!referenznummer || !company || !title) continue;
        const description = buildDescription(job);
        const combined = `${title} ${description}`;
        if (!matchesAutomatedResearchText(combined, "job")) continue;

        if (seen.has(referenznummer)) continue;
        seen.add(referenznummer);

        const location = job.stellenlokationen?.[0]?.adresse;
        const region = [location?.ort, location?.plz, location?.region]
          .filter(Boolean)
          .join(" ")
          .trim();

        matched.push({
          company_name: company,
          signal_type: "job",
          source_platform: SOURCE_PLATFORM,
          source_url: jobUrl(referenznummer),
          external_id: referenznummer,
          title,
          description,
          region: region || null,
          industry: job.hauptberuf ?? null,
        });
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Jobsuche-Fehler für „${keyword}"`);
    }
  }

  return { scanned, matched, errors };
}
