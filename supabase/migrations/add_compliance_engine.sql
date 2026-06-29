-- Compliance Engine: Pflichtfelder, Security-Score-Verlauf

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS security_score INTEGER DEFAULT 0;

ALTER TABLE measures
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS criticality TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0;

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS criticality TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsible TEXT;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS criticality TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS criticality TEXT NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsible TEXT;

CREATE TABLE IF NOT EXISTS security_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  level TEXT NOT NULL,
  summary TEXT,
  drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_security_score_snapshots_company
  ON security_score_snapshots(company_id, recorded_at DESC);

ALTER TABLE security_score_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own company score snapshots" ON security_score_snapshots;
CREATE POLICY "Users manage own company score snapshots"
  ON security_score_snapshots FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

GRANT ALL ON security_score_snapshots TO authenticated;
