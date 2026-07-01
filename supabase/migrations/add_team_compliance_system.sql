-- Teamfähiges Compliance-System: Rollen, Aufgaben, Benachrichtigungen, Onboarding

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Firmenrollen (Owner des Accounts + eingeladene Mitglieder)
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN ('owner', 'admin', 'it_responsible', 'management', 'employee', 'auditor')
  ),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN ('admin', 'it_responsible', 'management', 'employee', 'auditor')
  ),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (
    status IN ('invited', 'active', 'deactivated', 'expired', 'revoked')
  ),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company ON company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token);

-- Bestehende Firmeninhaber als Owner eintragen
INSERT INTO company_members (company_id, user_id, role, active)
SELECT c.id, c.user_id, 'owner', TRUE
FROM companies c
WHERE c.deleted_at IS NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (
    task_type IN ('risk', 'measure', 'document', 'evidence', 'training', 'incident', 'audit', 'general')
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'waiting_evidence', 'completed', 'overdue', 'blocked')
  ),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  completion_note TEXT,
  related_type TEXT,
  related_id UUID,
  reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_reminder_at TIMESTAMPTZ,
  next_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_task_items_company ON task_items(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_items_assigned ON task_items(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_items_related ON task_items(related_type, related_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_items_status ON task_items(company_id, status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'file' CHECK (
    evidence_type IN ('file', 'link', 'text', 'screenshot', 'pdf', 'training_confirmation')
  ),
  description TEXT,
  file_url TEXT,
  external_link TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  valid_until TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_type TEXT,
  related_id UUID,
  task_id UUID REFERENCES task_items(id) ON DELETE SET NULL,
  audit_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_items_company ON evidence_items(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_items_task ON evidence_items(task_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (
    severity IN ('info', 'warning', 'critical')
  ),
  related_type TEXT,
  related_id UUID,
  link_path TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value_json JSONB,
  new_value_json JSONB,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_company ON activity_log(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'skipped')
  ),
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, step_key)
);

CREATE TABLE IF NOT EXISTS data_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing' CHECK (
    status IN ('confirmed_with_evidence', 'confirmed', 'missing', 'contradictory')
  ),
  quality_level TEXT NOT NULL DEFAULT 'low',
  reason TEXT,
  related_type TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, check_key)
);

CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  related_type TEXT,
  related_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'failed', 'cancelled')
  ),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  area_key TEXT NOT NULL,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, area_key)
);

-- Hilfsfunktionen für RLS
CREATE OR REPLACE FUNCTION public.user_company_role(p_company_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM company_members m
  WHERE m.company_id = p_company_id
    AND m.user_id = auth.uid()
    AND m.active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_company(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members m
    WHERE m.company_id = p_company_id
      AND m.user_id = auth.uid()
      AND m.active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_company(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members m
    WHERE m.company_id = p_company_id
      AND m.user_id = auth.uid()
      AND m.active = TRUE
      AND m.role IN ('owner', 'admin', 'it_responsible')
  );
$$;

-- RLS aktivieren
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_questionnaire_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read company_members" ON company_members;
CREATE POLICY "Members read company_members" ON company_members FOR SELECT
  USING (can_access_company(company_id));

DROP POLICY IF EXISTS "Owners manage company_members" ON company_members;
CREATE POLICY "Owners manage company_members" ON company_members FOR ALL
  USING (user_company_role(company_id) IN ('owner', 'admin'))
  WITH CHECK (user_company_role(company_id) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Owners manage invitations" ON company_invitations;
CREATE POLICY "Owners manage invitations" ON company_invitations FOR ALL
  USING (user_company_role(company_id) IN ('owner', 'admin'))
  WITH CHECK (user_company_role(company_id) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Members read invitations" ON company_invitations;
CREATE POLICY "Members read invitations" ON company_invitations FOR SELECT
  USING (can_access_company(company_id));

DROP POLICY IF EXISTS "Members read tasks" ON task_items;
CREATE POLICY "Members read tasks" ON task_items FOR SELECT
  USING (
    can_access_company(company_id)
    AND (
      user_company_role(company_id) IN ('owner', 'admin', 'it_responsible', 'management', 'auditor')
      OR assigned_to = auth.uid()
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Writers manage tasks" ON task_items;
CREATE POLICY "Writers manage tasks" ON task_items FOR ALL
  USING (
    can_write_company(company_id)
    OR (assigned_to = auth.uid() AND user_company_role(company_id) = 'employee')
  )
  WITH CHECK (
    can_write_company(company_id)
    OR (assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "Members read evidence" ON evidence_items;
CREATE POLICY "Members read evidence" ON evidence_items FOR SELECT
  USING (can_access_company(company_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Writers manage evidence" ON evidence_items;
CREATE POLICY "Writers manage evidence" ON evidence_items FOR ALL
  USING (can_write_company(company_id) OR uploaded_by = auth.uid())
  WITH CHECK (can_write_company(company_id) OR uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System insert notifications" ON notifications;
CREATE POLICY "System insert notifications" ON notifications FOR INSERT
  WITH CHECK (can_access_company(company_id));

DROP POLICY IF EXISTS "Members read activity" ON activity_log;
CREATE POLICY "Members read activity" ON activity_log FOR SELECT
  USING (can_access_company(company_id));

DROP POLICY IF EXISTS "Writers insert activity" ON activity_log;
CREATE POLICY "Writers insert activity" ON activity_log FOR INSERT
  WITH CHECK (can_access_company(company_id));

DROP POLICY IF EXISTS "Members manage onboarding" ON onboarding_progress;
CREATE POLICY "Members manage onboarding" ON onboarding_progress FOR ALL
  USING (can_write_company(company_id))
  WITH CHECK (can_write_company(company_id));

DROP POLICY IF EXISTS "Members read onboarding" ON onboarding_progress;
CREATE POLICY "Members read onboarding" ON onboarding_progress FOR SELECT
  USING (can_access_company(company_id));

DROP POLICY IF EXISTS "Members read data quality" ON data_quality_checks;
CREATE POLICY "Members read data quality" ON data_quality_checks FOR SELECT
  USING (can_access_company(company_id));

DROP POLICY IF EXISTS "Writers manage data quality" ON data_quality_checks;
CREATE POLICY "Writers manage data quality" ON data_quality_checks FOR ALL
  USING (can_write_company(company_id))
  WITH CHECK (can_write_company(company_id));

DROP POLICY IF EXISTS "Members read questionnaires" ON compliance_questionnaire_responses;
CREATE POLICY "Members read questionnaires" ON compliance_questionnaire_responses FOR SELECT
  USING (can_access_company(company_id));

DROP POLICY IF EXISTS "Writers manage questionnaires" ON compliance_questionnaire_responses;
CREATE POLICY "Writers manage questionnaires" ON compliance_questionnaire_responses FOR ALL
  USING (can_write_company(company_id))
  WITH CHECK (can_write_company(company_id));

DROP TRIGGER IF EXISTS company_members_updated_at ON company_members;
CREATE TRIGGER company_members_updated_at
  BEFORE UPDATE ON company_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS company_invitations_updated_at ON company_invitations;
CREATE TRIGGER company_invitations_updated_at
  BEFORE UPDATE ON company_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS task_items_updated_at ON task_items;
CREATE TRIGGER task_items_updated_at
  BEFORE UPDATE ON task_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS evidence_items_updated_at ON evidence_items;
CREATE TRIGGER evidence_items_updated_at
  BEFORE UPDATE ON evidence_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS data_quality_checks_updated_at ON data_quality_checks;
CREATE TRIGGER data_quality_checks_updated_at
  BEFORE UPDATE ON data_quality_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS compliance_questionnaire_responses_updated_at ON compliance_questionnaire_responses;
CREATE TRIGGER compliance_questionnaire_responses_updated_at
  BEFORE UPDATE ON compliance_questionnaire_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
