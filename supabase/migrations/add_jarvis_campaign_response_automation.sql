-- Automatisierung nach erster Antwort (intern — kein Auto-Versand)

ALTER TABLE linkedin_campaign_responses
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'linkedin',
  ADD COLUMN IF NOT EXISTS response_time TIME,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recorded_by TEXT DEFAULT 'Nico',
  ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS suggested_reply TEXT,
  ADD COLUMN IF NOT EXISTS task_title TEXT,
  ADD COLUMN IF NOT EXISTS task_due_at TIMESTAMPTZ;

ALTER TABLE linkedin_campaign_leads
  ADD COLUMN IF NOT EXISTS suggested_reply TEXT,
  ADD COLUMN IF NOT EXISTS offer_notes TEXT,
  ADD COLUMN IF NOT EXISTS suggested_license TEXT,
  ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS management_review_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS linkedin_campaign_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES linkedin_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES linkedin_campaign_leads(id) ON DELETE CASCADE,
  response_id UUID REFERENCES linkedin_campaign_responses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_tasks_due ON linkedin_campaign_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_tasks_status ON linkedin_campaign_tasks(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaign_responses_channel ON linkedin_campaign_responses(channel);

DROP TRIGGER IF EXISTS linkedin_campaign_tasks_updated_at ON linkedin_campaign_tasks;
CREATE TRIGGER linkedin_campaign_tasks_updated_at
  BEFORE UPDATE ON linkedin_campaign_tasks
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

ALTER TABLE linkedin_campaign_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage linkedin_campaign_tasks" ON linkedin_campaign_tasks;
CREATE POLICY "Authenticated manage linkedin_campaign_tasks"
  ON linkedin_campaign_tasks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE linkedin_campaign_tasks IS 'Interne Vertriebsaufgaben nach Antwort — kein Auto-Versand';
