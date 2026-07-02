-- Jarvis Partner-Fokus: Scoring 0–100, Kategorien, Depriorisierung

ALTER TABLE b2b_outreach_leads
  ADD COLUMN IF NOT EXISTS partner_score INTEGER,
  ADD COLUMN IF NOT EXISTS lead_category TEXT,
  ADD COLUMN IF NOT EXISTS score_reason TEXT,
  ADD COLUMN IF NOT EXISTS recommended_pitch TEXT,
  ADD COLUMN IF NOT EXISTS recommended_next_step TEXT,
  ADD COLUMN IF NOT EXISTS deprioritized BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deprioritize_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_partner_score
  ON b2b_outreach_leads(partner_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_lead_category
  ON b2b_outreach_leads(lead_category);

COMMENT ON COLUMN b2b_outreach_leads.partner_score IS 'Partner-Lead-Score 0–100 (IT-Dienstleister, MSP, Berater)';
COMMENT ON COLUMN b2b_outreach_leads.lead_category IS 'Partner-Kategorie für B2B-Vertrieb';
COMMENT ON COLUMN b2b_outreach_leads.deprioritized IS 'Ausschluss-Zielgruppe — später prüfen, kein Auto-Outreach';
