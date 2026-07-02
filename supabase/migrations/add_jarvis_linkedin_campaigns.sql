-- Jarvis LinkedIn Kampagnenmanager (manuell — kein Auto-Versand)

CREATE TABLE IF NOT EXISTS linkedin_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_group TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  responsible TEXT NOT NULL DEFAULT 'Nico',
  pipeline_value NUMERIC(12, 2) DEFAULT 0,
  template_key TEXT,
  goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linkedin_campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES linkedin_campaigns(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  contact_name TEXT,
  linkedin_url TEXT,
  category TEXT,
  lead_score INTEGER,
  status TEXT NOT NULL DEFAULT 'new',
  next_step TEXT,
  notes TEXT,
  suggested_message TEXT,
  contacted_at TIMESTAMPTZ,
  follow_up_at TIMESTAMPTZ,
  reminder_type TEXT,
  b2b_outreach_lead_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linkedin_campaign_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES linkedin_campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES linkedin_campaign_leads(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  response_date DATE NOT NULL DEFAULT CURRENT_DATE,
  response_text TEXT,
  response_type TEXT NOT NULL DEFAULT 'interest',
  rating INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linkedin_campaign_demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES linkedin_campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES linkedin_campaign_leads(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned',
  result TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_status ON linkedin_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_leads_campaign ON linkedin_campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_leads_status ON linkedin_campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_leads_follow_up ON linkedin_campaign_leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_responses_campaign ON linkedin_campaign_responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_demos_campaign ON linkedin_campaign_demos(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_demos_scheduled ON linkedin_campaign_demos(scheduled_at);

DROP TRIGGER IF EXISTS linkedin_campaigns_updated_at ON linkedin_campaigns;
CREATE TRIGGER linkedin_campaigns_updated_at
  BEFORE UPDATE ON linkedin_campaigns
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS linkedin_campaign_leads_updated_at ON linkedin_campaign_leads;
CREATE TRIGGER linkedin_campaign_leads_updated_at
  BEFORE UPDATE ON linkedin_campaign_leads
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS linkedin_campaign_demos_updated_at ON linkedin_campaign_demos;
CREATE TRIGGER linkedin_campaign_demos_updated_at
  BEFORE UPDATE ON linkedin_campaign_demos
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

ALTER TABLE linkedin_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_campaign_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_campaign_demos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage linkedin_campaigns" ON linkedin_campaigns;
CREATE POLICY "Authenticated manage linkedin_campaigns"
  ON linkedin_campaigns FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage linkedin_campaign_leads" ON linkedin_campaign_leads;
CREATE POLICY "Authenticated manage linkedin_campaign_leads"
  ON linkedin_campaign_leads FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage linkedin_campaign_responses" ON linkedin_campaign_responses;
CREATE POLICY "Authenticated manage linkedin_campaign_responses"
  ON linkedin_campaign_responses FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage linkedin_campaign_demos" ON linkedin_campaign_demos;
CREATE POLICY "Authenticated manage linkedin_campaign_demos"
  ON linkedin_campaign_demos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE linkedin_campaigns IS 'Jarvis LinkedIn Kampagnen — manueller Versand durch Nico';
COMMENT ON TABLE linkedin_campaign_leads IS 'Leads pro LinkedIn-Kampagne';
