-- Jarvis Lead Finder: Kontaktdaten, Qualitäts-Score, Partner-Potenzial

ALTER TABLE b2b_outreach_leads
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS has_contact_form BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS lead_quality_score INTEGER,
  ADD COLUMN IF NOT EXISTS lead_quality_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_contactable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_potential TEXT,
  ADD COLUMN IF NOT EXISTS outreach_priority TEXT;

CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_quality_score
  ON b2b_outreach_leads(lead_quality_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_contactable
  ON b2b_outreach_leads(is_contactable) WHERE is_contactable = true;

COMMENT ON COLUMN b2b_outreach_leads.lead_quality_score IS 'Lead Finder Qualität 0–100+ (Kontakt + Zielbranche)';
COMMENT ON COLUMN b2b_outreach_leads.partner_potential IS 'white_label | reseller | end_customer';
COMMENT ON COLUMN b2b_outreach_leads.outreach_priority IS 'high | medium | low';
