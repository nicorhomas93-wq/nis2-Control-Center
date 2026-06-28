-- Web-Presence Entity-Resolution für B2B Outreach (migrationssicher, nullable)

ALTER TABLE b2b_outreach_leads
  ADD COLUMN IF NOT EXISTS detected_website_url TEXT,
  ADD COLUMN IF NOT EXISTS detected_website_type TEXT,
  ADD COLUMN IF NOT EXISTS web_presence_status TEXT,
  ADD COLUMN IF NOT EXISTS web_presence_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS web_presence_note TEXT,
  ADD COLUMN IF NOT EXISTS web_presence_evidence JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_web_presence_status
  ON b2b_outreach_leads(web_presence_status);

COMMENT ON COLUMN b2b_outreach_leads.web_presence_status IS
  'own_website_confirmed | group_or_brand_presence | directory_presence_only | unclear_presence | no_reliable_web_presence';
