import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchJobsucheSignals } from "@/lib/jarvis/lead-research/fetchers/jobsuche";
import { fetchOeffentlicheVergabeSignals } from "@/lib/jarvis/lead-research/fetchers/oeffentliche-vergabe";
import { fetchScrapedSignals } from "@/lib/jarvis/lead-research/scrapers";
import type { ResearchCandidate } from "@/lib/jarvis/lead-research/fetchers/types";
import { qualifyResearchLead } from "@/lib/jarvis/lead-research/lead-qualification";
import { purgeBlockedResearchSignals } from "@/lib/jarvis/lead-research/purge-blocked";

export interface LeadResearchRunResult {
  runId: string | null;
  tendersScanned: number;
  tendersMatched: number;
  jobsScanned: number;
  jobsMatched: number;
  announcementsScanned: number;
  announcementsMatched: number;
  inserted: number;
  skippedDuplicates: number;
  skippedRejected: number;
  purgedBlocked: number;
  errors: string[];
}

async function loadExistingExternalIds(
  client: SupabaseClient,
  platform: string,
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const existing = new Set<string>();
  const chunkSize = 100;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data } = await client
      .from("jarvis_lead_research_signals")
      .select("external_id")
      .eq("source_platform", platform)
      .in("external_id", chunk);

    for (const row of data ?? []) {
      if (row.external_id) existing.add(row.external_id);
    }
  }

  return existing;
}

async function insertCandidates(
  client: SupabaseClient,
  candidates: ResearchCandidate[]
): Promise<{ inserted: number; skippedDuplicates: number; skippedRejected: number }> {
  if (candidates.length === 0) return { inserted: 0, skippedDuplicates: 0, skippedRejected: 0 };

  const byPlatform = new Map<string, ResearchCandidate[]>();
  for (const candidate of candidates) {
    const list = byPlatform.get(candidate.source_platform) ?? [];
    list.push(candidate);
    byPlatform.set(candidate.source_platform, list);
  }

  let skippedDuplicates = 0;
  let skippedRejected = 0;
  const rows: Record<string, unknown>[] = [];

  for (const [platform, platformCandidates] of byPlatform) {
    const existing = await loadExistingExternalIds(
      client,
      platform,
      platformCandidates.map((c) => c.external_id)
    );

    for (const candidate of platformCandidates) {
      if (existing.has(candidate.external_id)) {
        skippedDuplicates++;
        continue;
      }

      const qualified = qualifyResearchLead({
        company_name: candidate.company_name,
        signal_type: candidate.signal_type,
        title: candidate.title,
        description: candidate.description,
        industry: candidate.industry,
        source_url: candidate.source_url,
        source_platform: candidate.source_platform,
      });

      if (!qualified.accepted) {
        skippedRejected++;
        continue;
      }

      rows.push({
        company_name: candidate.company_name,
        signal_type: candidate.signal_type,
        source_platform: candidate.source_platform,
        source_url: candidate.source_url,
        external_id: candidate.external_id,
        title: candidate.title,
        description: candidate.description,
        region: candidate.region,
        industry: candidate.industry,
        industry_priority: qualified.industry_priority,
        research_score: qualified.research_score,
        score_reason: qualified.score_reason,
        keywords_matched: qualified.keywords_matched,
        lead_type: qualified.lead_type,
        lead_priority: qualified.lead_priority,
        demand_signal: qualified.demand_signal,
        signal_art: qualified.signal_art,
        tknd_modules: qualified.tknd_modules,
        recommended_action: qualified.recommended_action,
        relevance_note: qualified.relevance_note,
        status: "new",
      });
    }
  }

  if (rows.length === 0) {
    return { inserted: 0, skippedDuplicates, skippedRejected };
  }

  const { error } = await client.from("jarvis_lead_research_signals").insert(rows);
  if (error) {
    throw new Error(error.message);
  }

  return { inserted: rows.length, skippedDuplicates, skippedRejected };
}

export async function runLeadResearch(options?: {
  triggerSource?: "cron" | "manual";
  pubDay?: string;
}): Promise<LeadResearchRunResult> {
  const client = createAdminClient();
  const triggerSource = options?.triggerSource ?? "cron";

  if (!client) {
    return {
      runId: null,
      tendersScanned: 0,
      tendersMatched: 0,
      jobsScanned: 0,
      jobsMatched: 0,
      announcementsScanned: 0,
      announcementsMatched: 0,
      inserted: 0,
      skippedDuplicates: 0,
      skippedRejected: 0,
      purgedBlocked: 0,
      errors: ["Admin-Client nicht verfügbar (SUPABASE_SERVICE_ROLE_KEY)"],
    };
  }

  const { data: runRow, error: runError } = await client
    .from("jarvis_lead_research_runs")
    .insert({ status: "running", trigger_source: triggerSource })
    .select("id")
    .single();

  if (runError) {
    return {
      runId: null,
      tendersScanned: 0,
      tendersMatched: 0,
      jobsScanned: 0,
      jobsMatched: 0,
      announcementsScanned: 0,
      announcementsMatched: 0,
      inserted: 0,
      skippedDuplicates: 0,
      skippedRejected: 0,
      purgedBlocked: 0,
      errors: [runError.message],
    };
  }

  const runId = runRow.id as string;
  const errors: string[] = [];
  let purgedBlocked = 0;

  try {
    purgedBlocked = await purgeBlockedResearchSignals(client);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Bereinigung blockierter Quellen fehlgeschlagen");
  }

  const [apiTenders, apiJobs, scraped] = await Promise.all([
    fetchOeffentlicheVergabeSignals(options?.pubDay),
    fetchJobsucheSignals(),
    fetchScrapedSignals(),
  ]);

  const tenderResult = {
    scanned: apiTenders.scanned + scraped.tenders.scanned,
    matched: [...apiTenders.matched, ...scraped.tenders.matched],
    errors: [...apiTenders.errors, ...scraped.tenders.errors],
  };

  const jobResult = {
    scanned: apiJobs.scanned + scraped.jobs.scanned,
    matched: [...apiJobs.matched, ...scraped.jobs.matched],
    errors: [...apiJobs.errors, ...scraped.jobs.errors],
  };

  const announcementResult = scraped.announcements;

  errors.push(...tenderResult.errors, ...jobResult.errors, ...announcementResult.errors);

  let inserted = 0;
  let skippedDuplicates = 0;
  let skippedRejected = 0;

  try {
    const persist = await insertCandidates(client, [
      ...tenderResult.matched,
      ...jobResult.matched,
      ...announcementResult.matched,
    ]);
    inserted = persist.inserted;
    skippedDuplicates = persist.skippedDuplicates;
    skippedRejected = persist.skippedRejected;
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
  }

  const status = errors.length > 0 && inserted === 0 ? "failed" : "completed";

  await client
    .from("jarvis_lead_research_runs")
    .update({
      finished_at: new Date().toISOString(),
      status,
      tenders_scanned: tenderResult.scanned,
      tenders_matched: tenderResult.matched.length,
      jobs_scanned: jobResult.scanned,
      jobs_matched: jobResult.matched.length,
      announcements_scanned: announcementResult.scanned,
      announcements_matched: announcementResult.matched.length,
      inserted,
      skipped_duplicates: skippedDuplicates,
      skipped_rejected: skippedRejected,
      errors,
    })
    .eq("id", runId);

  return {
    runId,
    tendersScanned: tenderResult.scanned,
    tendersMatched: tenderResult.matched.length,
    jobsScanned: jobResult.scanned,
    jobsMatched: jobResult.matched.length,
    announcementsScanned: announcementResult.scanned,
    announcementsMatched: announcementResult.matched.length,
    inserted,
    skippedDuplicates,
    skippedRejected,
    purgedBlocked,
    errors,
  };
}

export async function getLatestLeadResearchRun(client: SupabaseClient) {
  const { data, error } = await client
    .from("jarvis_lead_research_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}
