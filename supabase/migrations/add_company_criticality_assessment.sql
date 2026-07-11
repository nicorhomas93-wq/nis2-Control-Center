-- Kritikalitätsbewertung für IT- und Geschäftsumfeld (NIS2 / ISO 27001 / BSI)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS business_criticality_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_data_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS infrastructure_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS business_criticality_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_criticality_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infrastructure_criticality_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS criticality_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS criticality_level TEXT NOT NULL DEFAULT 'unbekannt'
    CHECK (criticality_level IN ('unbekannt', 'niedrig', 'mittel', 'hoch', 'kritisch'));
