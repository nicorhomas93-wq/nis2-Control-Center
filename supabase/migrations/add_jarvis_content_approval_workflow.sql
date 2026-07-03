-- Jarvis Freigabe-Workflow: Beiträge, Kampagnen, Audit-Log

ALTER TABLE linkedin_publishing_posts
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES linkedin_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'jarvis',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE linkedin_campaigns
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS jarvis_content_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  campaign_id UUID REFERENCES linkedin_campaigns(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jarvis_content_audit_entity ON jarvis_content_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_jarvis_content_audit_created ON jarvis_content_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_publishing_posts_campaign ON linkedin_publishing_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_approval ON linkedin_campaigns(approval_status);

ALTER TABLE jarvis_content_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage jarvis_content_audit_log" ON jarvis_content_audit_log;
CREATE POLICY "Authenticated manage jarvis_content_audit_log"
  ON jarvis_content_audit_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE jarvis_content_audit_log IS 'Protokoll: erstellt, freigegeben, veröffentlicht — Jarvis Content Pipeline';
