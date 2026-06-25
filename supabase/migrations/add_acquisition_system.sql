-- Acquisition System: Tracking, Leads, E-Mail-Automation
-- Im Supabase SQL Editor ausführen

-- ─── acquisition_visitors ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS acquisition_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL UNIQUE,
  visit_count INTEGER NOT NULL DEFAULT 1,
  lead_score INTEGER NOT NULL DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  retargeting_eligible BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_visitors_visitor_id ON acquisition_visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_visitors_retargeting ON acquisition_visitors(retargeting_eligible) WHERE retargeting_eligible = true;
CREATE INDEX IF NOT EXISTS idx_acquisition_visitors_lead_score ON acquisition_visitors(lead_score DESC);

-- ─── acquisition_events ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS acquisition_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_events_visitor_id ON acquisition_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_events_type ON acquisition_events(event_type);
CREATE INDEX IF NOT EXISTS idx_acquisition_events_created_at ON acquisition_events(created_at DESC);

-- ─── acquisition_leads ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS acquisition_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT,
  email TEXT,
  company_name TEXT,
  industry TEXT,
  company_size TEXT,
  funnel_result JSONB,
  acquisition_score INTEGER NOT NULL DEFAULT 0,
  funnel_score INTEGER,
  source TEXT NOT NULL DEFAULT 'nis2_check',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  strong_offer_eligible BOOLEAN NOT NULL DEFAULT false,
  jarvis_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  email_sequence_step INTEGER NOT NULL DEFAULT 0,
  next_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_leads_email ON acquisition_leads(email);
CREATE INDEX IF NOT EXISTS idx_acquisition_leads_visitor_id ON acquisition_leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_leads_status ON acquisition_leads(status);
CREATE INDEX IF NOT EXISTS idx_acquisition_leads_score ON acquisition_leads(acquisition_score DESC);
CREATE INDEX IF NOT EXISTS idx_acquisition_leads_next_email ON acquisition_leads(next_email_at) WHERE next_email_at IS NOT NULL;

-- ─── acquisition_email_queue ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS acquisition_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_lead_id UUID NOT NULL REFERENCES acquisition_leads(id) ON DELETE CASCADE,
  sequence_day INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_email_queue_status ON acquisition_email_queue(status, scheduled_at);

-- ─── updated_at ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION acquisition_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS acquisition_visitors_updated_at ON acquisition_visitors;
CREATE TRIGGER acquisition_visitors_updated_at
  BEFORE UPDATE ON acquisition_visitors
  FOR EACH ROW EXECUTE FUNCTION acquisition_set_updated_at();

DROP TRIGGER IF EXISTS acquisition_leads_updated_at ON acquisition_leads;
CREATE TRIGGER acquisition_leads_updated_at
  BEFORE UPDATE ON acquisition_leads
  FOR EACH ROW EXECUTE FUNCTION acquisition_set_updated_at();

-- ─── RLS (Service Role via Admin Client) ─────────────────────────────────────

ALTER TABLE acquisition_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read acquisition" ON acquisition_visitors;
CREATE POLICY "Authenticated read acquisition"
  ON acquisition_visitors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read acquisition_events" ON acquisition_events;
CREATE POLICY "Authenticated read acquisition_events"
  ON acquisition_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read acquisition_leads" ON acquisition_leads;
CREATE POLICY "Authenticated read acquisition_leads"
  ON acquisition_leads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read acquisition_email_queue" ON acquisition_email_queue;
CREATE POLICY "Authenticated read acquisition_email_queue"
  ON acquisition_email_queue FOR SELECT TO authenticated USING (true);

GRANT SELECT ON acquisition_visitors, acquisition_events, acquisition_leads, acquisition_email_queue TO authenticated;

-- Funnel-Nurturing E-Mail-Vorlagen (Jarvis)
INSERT INTO email_templates (name, purpose, subject, body, active)
SELECT
  'NIS2-Check Tag 0 — Ergebnis',
  'acquisition_day_0',
  'Ihr NIS2-Check Ergebnis — nächste Schritte',
  E'Hallo,\n\nvielen Dank für Ihren NIS2-Schnellcheck.\n\n{{result_summary}}\n\nOhne vollständige Dokumentation bleibt Ihr Risiko bei einer Prüfung oder einem Vorfall hoch.\n\n→ Jetzt Struktur aufbauen: {{check_url}}\n\nHinweis: Keine Rechtsberatung. Keine Garantie auf vollständige Compliance.\n\nFreundliche Grüße\nTKND Unity GbR',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE purpose = 'acquisition_day_0');

INSERT INTO email_templates (name, purpose, subject, body, active)
SELECT
  'NIS2-Check Tag 1 — Risiko',
  'acquisition_day_1',
  'Was passiert ohne NIS2-Nachweise?',
  E'Hallo,\n\nkurz zum Risiko:\n\n• Keine vollständige Dokumentation\n• Unklare Maßnahmen\n• Kein prüfbarer Status\n\nIm Ernstfall bleiben 72 Stunden zur Meldung.\n\n→ Ergebnis erneut ansehen: {{check_url}}\n\nFreundliche Grüße\nTKND Unity GbR',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE purpose = 'acquisition_day_1');

INSERT INTO email_templates (name, purpose, subject, body, active)
SELECT
  'NIS2-Check Tag 3 — Lösung',
  'acquisition_day_3',
  'NIS2-Struktur in Tagen statt Monaten',
  E'Hallo,\n\ndas TKND NIS2 Control Center hilft Ihnen:\n\n• Betroffenheit prüfen\n• Pflichtdokumente erstellen\n• Maßnahmen und Risiken nachverfolgen\n• Audit-Ordner exportieren\n\n→ Jetzt starten: {{upgrade_url}}\n\nFreundliche Grüße\nTKND Unity GbR',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE purpose = 'acquisition_day_3');

INSERT INTO email_templates (name, purpose, subject, body, active)
SELECT
  'NIS2-Check Tag 5 — Angebot',
  'acquisition_day_5',
  'Ihr NIS2-Setup — Pilot oder Abo',
  E'Hallo,\n\nSie haben den NIS2-Check abgeschlossen. Jetzt fehlt die Umsetzung.\n\n{{offer_line}}\n\n→ Pilot starten (499 € einmalig): {{pilot_url}}\n→ Abo wählen: {{upgrade_url}}\n\nFreundliche Grüße\nTKND Unity GbR',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE purpose = 'acquisition_day_5');
