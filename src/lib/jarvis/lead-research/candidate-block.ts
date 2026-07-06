import type { ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";
import { isBlockedMediaSource } from "@/lib/jarvis/lead-research/media-block";

export function isBlockedResearchCandidate(candidate: ResearchCandidate): boolean {
  return isBlockedMediaSource(candidate);
}

export function filterResearchCandidates(candidates: ResearchCandidate[]): ResearchCandidate[] {
  return candidates.filter((c) => !isBlockedResearchCandidate(c));
}
