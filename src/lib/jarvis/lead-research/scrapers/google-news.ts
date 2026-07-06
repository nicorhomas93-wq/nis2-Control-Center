import type { FetcherResult } from "@/lib/jarvis/lead-research/fetchers/types";

/** Deaktiviert — Jarvis filtert Presse/Ratgeber ohne Organisations-Bedarf. */
export async function fetchGoogleNewsSignals(): Promise<FetcherResult> {
  return { scanned: 0, matched: [], errors: [] };
}
