-- Behandlungsstatus für Risiken (offen / behandelt / reduziert)

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS treatment_status TEXT NOT NULL DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_risks_treatment_status
  ON risks(company_id, treatment_status);
