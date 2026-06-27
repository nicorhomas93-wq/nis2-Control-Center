-- Outreach-Hook (1-Satz-Ansprache) + Standort

ALTER TABLE b2b_outreach_leads
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS outreach_hook TEXT;

CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_city ON b2b_outreach_leads(city);
CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_region ON b2b_outreach_leads(region);
