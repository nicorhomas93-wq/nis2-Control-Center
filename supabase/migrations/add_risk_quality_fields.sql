-- Risikoanalyse: Schwachstelle und Business Impact

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS vulnerability TEXT,
  ADD COLUMN IF NOT EXISTS business_impact TEXT;
