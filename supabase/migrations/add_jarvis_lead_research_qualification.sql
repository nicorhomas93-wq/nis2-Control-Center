-- Jarvis Lead Research: Qualifikation, Lead-Typ, Priorität, TKND-Bezug

ALTER TABLE jarvis_lead_research_signals
  ADD COLUMN IF NOT EXISTS lead_type TEXT,
  ADD COLUMN IF NOT EXISTS lead_priority TEXT,
  ADD COLUMN IF NOT EXISTS demand_signal TEXT,
  ADD COLUMN IF NOT EXISTS signal_art TEXT,
  ADD COLUMN IF NOT EXISTS tknd_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_action TEXT,
  ADD COLUMN IF NOT EXISTS relevance_note TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

ALTER TABLE jarvis_lead_research_runs
  ADD COLUMN IF NOT EXISTS skipped_rejected INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lead_research_signals_lead_priority
  ON jarvis_lead_research_signals(lead_priority);

CREATE INDEX IF NOT EXISTS idx_lead_research_signals_lead_type
  ON jarvis_lead_research_signals(lead_type);
