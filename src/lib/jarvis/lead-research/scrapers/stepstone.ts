import { JOB_KEYWORDS } from "@/lib/jarvis/lead-research/constants";
import { matchesAutomatedResearchText } from "@/lib/jarvis/lead-research/fetchers/keyword-match";
import type { FetcherResult, ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";
import { fetchText } from "@/lib/jarvis/lead-research/scrapers/http";

const SOURCE_PLATFORM = "Stepstone";
const BASE_URL = "https://www.stepstone.de";

const STEPSTONE_SEARCH_KEYWORDS = [
  "NIS2",
  "ISO-27001",
  "Informationssicherheitsbeauftragter",
  "IT-Security-Manager",
  "Cyber-Security-Manager",
  "ISMS",
] as const;

interface StepstoneJob {
  id: string;
  title: string;
  url: string;
  company: string;
  location: string;
}

function slugKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9äöüß-]/gi, "");
}

function searchUrl(keyword: string): string {
  return `${BASE_URL}/jobs/${slugKeyword(keyword)}/in-deutschland`;
}

function parseEmbeddedJobs(html: string): StepstoneJob[] {
  const pattern =
    /"id":(\d+),"title":"((?:\\.|[^"\\])*)","labels":\[[^\]]*\],"url":"([^"]+)","companyId":\d+,"companyName":"((?:\\.|[^"\\])*)"(?:,"companyUrl":"[^"]*")?(?:,"companyLogoUrl":"[^"]*")?,"datePosted":"[^"]*","location":"((?:\\.|[^"\\])*)"/g;

  const jobs: StepstoneJob[] = [];
  for (const match of html.matchAll(pattern)) {
    jobs.push({
      id: match[1],
      title: JSON.parse(`"${match[2]}"`),
      url: match[3],
      company: JSON.parse(`"${match[4]}"`),
      location: JSON.parse(`"${match[5]}"`),
    });
  }
  return jobs;
}

function toAbsoluteUrl(path: string): string {
  if (path.startsWith("http")) return path.split("?")[0];
  return `${BASE_URL}${path.split("?")[0]}`;
}

async function fetchKeywordJobs(keyword: string): Promise<{
  scanned: number;
  matched: ResearchCandidate[];
  error?: string;
}> {
  const { ok, status, text } = await fetchText(searchUrl(keyword), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    timeoutMs: 60_000,
  });

  if (!ok) {
    return { scanned: 0, matched: [], error: `Stepstone „${keyword}“: HTTP ${status}` };
  }

  const jobs = parseEmbeddedJobs(text);
  const matched: ResearchCandidate[] = [];

  for (const job of jobs) {
    const combined = `${job.title} ${job.company}`;
    if (!matchesAutomatedResearchText(combined, "job")) continue;

    matched.push({
      company_name: job.company,
      signal_type: "job",
      source_platform: SOURCE_PLATFORM,
      source_url: toAbsoluteUrl(job.url),
      external_id: `stepstone-${job.id}`,
      title: job.title,
      description: `${job.company} · ${job.location}`,
      region: job.location,
      industry: null,
    });
  }

  return { scanned: jobs.length, matched };
}

export async function fetchStepstoneSignals(): Promise<FetcherResult> {
  const errors: string[] = [];
  const matched: ResearchCandidate[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  const keywords = [
    ...new Set([
      ...STEPSTONE_SEARCH_KEYWORDS,
      ...JOB_KEYWORDS.filter((k) => k.length > 3).slice(0, 4),
    ]),
  ];

  for (const keyword of keywords) {
    try {
      const result = await fetchKeywordJobs(keyword);
      scanned += result.scanned;
      if (result.error) errors.push(result.error);

      for (const candidate of result.matched) {
        if (seen.has(candidate.external_id)) continue;
        seen.add(candidate.external_id);
        matched.push(candidate);
      }
    } catch (err) {
      errors.push(
        err instanceof Error ? `Stepstone „${keyword}“: ${err.message}` : `Stepstone „${keyword}“: Fehler`
      );
    }
  }

  return { scanned, matched, errors };
}
