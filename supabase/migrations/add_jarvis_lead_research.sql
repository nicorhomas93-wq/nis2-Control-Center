-- Jarvis Lead Research — Ausschreibungen, Jobs, Meldungen (Bedarfssignale)

CREATE TABLE IF NOT EXISTS jarvis_lead_research_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  source_platform TEXT,
  source_url TEXT,
  title TEXT,
  description TEXT,
  region TEXT,
  industry TEXT,
  industry_priority TEXT,
  research_score INTEGER NOT NULL DEFAULT 50,
  score_reason TEXT,
  keywords_matched JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  b2b_outreach_lead_id UUID REFERENCES b2b_outreach_leads(id) ON DELETE SET NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_research_signals_score ON jarvis_lead_research_signals(research_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_research_signals_status ON jarvis_lead_research_signals(status);
CREATE INDEX IF NOT EXISTS idx_lead_research_signals_type ON jarvis_lead_research_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_lead_research_signals_company ON jarvis_lead_research_signals(company_name);

DROP TRIGGER IF EXISTS jarvis_lead_research_signals_updated_at ON jarvis_lead_research_signals;
CREATE TRIGGER jarvis_lead_research_signals_updated_at
  BEFORE UPDATE ON jarvis_lead_research_signals
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

ALTER TABLE jarvis_lead_research_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage jarvis_lead_research_signals" ON jarvis_lead_research_signals;
CREATE POLICY "Authenticated manage jarvis_lead_research_signals"
  ON jarvis_lead_research_signals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE jarvis_lead_research_signals IS 'Jarvis B2B Lead Research — NIS2/Security-Bedarfssignale';
