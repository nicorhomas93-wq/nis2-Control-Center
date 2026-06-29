-- Compliance-Aktivitäten für Dashboard und Nachverfolgung

CREATE TABLE IF NOT EXISTS compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
  measure_id UUID REFERENCES measures(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_company
  ON compliance_events(company_id, created_at DESC);

ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own compliance events" ON compliance_events;
CREATE POLICY "Users manage own compliance events"
  ON compliance_events FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

GRANT ALL ON compliance_events TO authenticated;
