-- Strukturierte Assets für Risiken und Maßnahmen

CREATE TABLE IF NOT EXISTS company_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('it_systems', 'data', 'organization', 'external_providers')),
  description TEXT,
  criticality TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_company_assets_company ON company_assets(company_id);

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES company_assets(id) ON DELETE SET NULL;

ALTER TABLE measures
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES company_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS risk_id UUID REFERENCES risks(id) ON DELETE SET NULL;

ALTER TABLE company_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own company assets" ON company_assets;
CREATE POLICY "Users manage own company assets"
  ON company_assets FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

GRANT ALL ON company_assets TO authenticated;

CREATE TRIGGER company_assets_updated_at
  BEFORE UPDATE ON company_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
