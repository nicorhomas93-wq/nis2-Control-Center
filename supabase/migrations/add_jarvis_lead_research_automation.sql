-- Lead Research: Dedupe + Lauf-Protokoll für automatischen Cron

ALTER TABLE jarvis_lead_research_signals
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_research_signals_external
  ON jarvis_lead_research_signals (source_platform, external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS jarvis_lead_research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_source TEXT NOT NULL DEFAULT 'cron',
  tenders_scanned INTEGER NOT NULL DEFAULT 0,
  tenders_matched INTEGER NOT NULL DEFAULT 0,
  jobs_scanned INTEGER NOT NULL DEFAULT 0,
  jobs_matched INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  skipped_duplicates INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_lead_research_runs_started
  ON jarvis_lead_research_runs (started_at DESC);

ALTER TABLE jarvis_lead_research_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage jarvis_lead_research_runs" ON jarvis_lead_research_runs;
CREATE POLICY "Authenticated manage jarvis_lead_research_runs"
  ON jarvis_lead_research_runs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE jarvis_lead_research_runs IS 'Protokoll täglicher Jarvis Lead-Research-Läufe';
