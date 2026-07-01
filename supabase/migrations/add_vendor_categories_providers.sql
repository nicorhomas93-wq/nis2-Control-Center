-- Kategorien und Provider-Referenz für Lieferantenmodul

ALTER TABLE company_vendors
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'sonstiger'
  CHECK (
    category IN (
      'cloud',
      'hosting',
      'saas',
      'rechenzentrum',
      'managed_services',
      'it_dienstleister',
      'softwareanbieter',
      'telekommunikation',
      'sonstiger'
    )
  );

ALTER TABLE company_vendors
  ADD COLUMN IF NOT EXISTS provider_key TEXT;

CREATE INDEX IF NOT EXISTS idx_company_vendors_category
  ON company_vendors(category)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_company_vendors_provider_key
  ON company_vendors(provider_key)
  WHERE deleted_at IS NULL AND provider_key IS NOT NULL;
