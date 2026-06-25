-- Jarvis Sales Agent — Leads, Interaktionen, Pipeline, E-Mail-Vorlagen, Audit-Log
-- Im Supabase SQL Editor ausführen: https://supabase.com/dashboard/project/hmyeguskotcydmodoedr/sql

-- Pilotanfragen lesen (für Jarvis-Sync)
DROP POLICY IF EXISTS "Authenticated read pilot requests" ON pilot_requests;
CREATE POLICY "Authenticated read pilot requests"
  ON pilot_requests FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON pilot_requests TO authenticated;

-- ─── leads ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  industry TEXT,
  company_size TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  lead_score INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  consent_status TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ─── lead_interactions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_status ON lead_interactions(status);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON lead_interactions(type);

-- ─── sales_tasks ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_tasks_lead_id ON sales_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_status ON sales_tasks(status);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_due_date ON sales_tasks(due_date);

-- ─── email_templates ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  purpose TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── jarvis_events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jarvis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jarvis_events_created_at ON jarvis_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jarvis_events_event_type ON jarvis_events(event_type);

-- ─── updated_at Trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION jarvis_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS sales_tasks_updated_at ON sales_tasks;
CREATE TRIGGER sales_tasks_updated_at
  BEFORE UPDATE ON sales_tasks
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage leads" ON leads;
CREATE POLICY "Authenticated manage leads"
  ON leads FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage lead_interactions" ON lead_interactions;
CREATE POLICY "Authenticated manage lead_interactions"
  ON lead_interactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage sales_tasks" ON sales_tasks;
CREATE POLICY "Authenticated manage sales_tasks"
  ON sales_tasks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage email_templates" ON email_templates;
CREATE POLICY "Authenticated manage email_templates"
  ON email_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage jarvis_events" ON jarvis_events;
CREATE POLICY "Authenticated manage jarvis_events"
  ON jarvis_events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON leads, lead_interactions, sales_tasks, email_templates, jarvis_events TO authenticated;

-- ─── Standard-E-Mail-Vorlagen (Entwürfe, keine Auto-Versendung) ──────────────

INSERT INTO email_templates (name, purpose, subject, body, active)
SELECT
  'Pilotanfrage — Erstkontakt',
  'first_contact',
  'Ihre Pilotanfrage — TKND NIS2 Control Center',
  E'Hallo {{contact_name}},\n\nvielen Dank für Ihre Pilotanfrage zum TKND NIS2 Control Center.\n\nWir haben Ihre Anfrage von {{company_name}} erhalten und melden uns zeitnah mit den nächsten Schritten.\n\nHinweis: Das TKND NIS2 Control Center unterstützt bei der Dokumentation und Organisation von NIS2-relevanten Prozessen. Es stellt keine Rechtsberatung dar und gibt keine Garantie für die vollständige Erfüllung gesetzlicher Anforderungen.\n\nFreundliche Grüße\nTKND Unity GbR',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE purpose = 'first_contact');

INSERT INTO email_templates (name, purpose, subject, body, active)
SELECT
  'Follow-up nach 3 Tagen',
  'follow_up',
  'Kurzes Follow-up — TKND NIS2 Control Center',
  E'Hallo {{contact_name}},\n\nich wollte kurz nachfragen, ob Sie noch Fragen zu unserem NIS2 Control Center haben.\n\nGerne können wir einen kurzen Demo-Termin vereinbaren.\n\nHinweis: Keine Rechtsberatung. Keine Garantie auf vollständige Compliance.\n\nFreundliche Grüße\nTKND Unity GbR',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE purpose = 'follow_up');

INSERT INTO email_templates (name, purpose, subject, body, active)
SELECT
  'Demo-Einladung',
  'demo_invitation',
  'Demo-Termin — TKND NIS2 Control Center',
  E'Hallo {{contact_name}},\n\nwir würden Ihnen gerne das TKND NIS2 Control Center in einer kurzen Demo zeigen.\n\nBitte nennen Sie uns 2–3 Terminvorschläge, die für Sie passen.\n\nHinweis: Die Demo dient der Orientierung. Sie ersetzt keine Rechtsberatung.\n\nFreundliche Grüße\nTKND Unity GbR',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE purpose = 'demo_invitation');
