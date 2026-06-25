-- Pilot-Setup-Zahlung (499 €) nachverfolgen
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pilot_setup_paid_at timestamptz;
