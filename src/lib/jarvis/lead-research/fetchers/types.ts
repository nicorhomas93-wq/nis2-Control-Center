import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";

export interface ResearchCandidate {
  company_name: string;
  signal_type: ResearchSignalType;
  source_platform: string;
  source_url: string;
  external_id: string;
  title: string;
  description: string;
  region: string | null;
  industry: string | null;
}

export interface FetcherResult {
  scanned: number;
  matched: ResearchCandidate[];
  errors: string[];
}
