-- Traffic Jarvis — Zielgruppen, Recherche, Outreach, Content, Kampagnen
-- Voraussetzung: add_jarvis_sales.sql (jarvis_set_updated_at)
-- Im Supabase SQL Editor ausführen.

CREATE OR REPLACE FUNCTION jarvis_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── traffic_target_groups ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS traffic_target_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  company_size TEXT,
  pain_points TEXT,
  value_proposition TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── traffic_search_profiles ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS traffic_search_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_group_id UUID REFERENCES traffic_target_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  platform TEXT,
  search_query TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── outreach_drafts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outreach_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_group_id UUID REFERENCES traffic_target_groups(id) ON DELETE SET NULL,
  channel TEXT,
  purpose TEXT,
  subject TEXT,
  body TEXT,
  tone TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── content_ideas ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  platform TEXT,
  content_type TEXT,
  hook TEXT,
  outline TEXT,
  call_to_action TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── traffic_campaigns ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS traffic_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_group_id UUID REFERENCES traffic_target_groups(id) ON DELETE SET NULL,
  goal TEXT,
  weekly_target INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── traffic_tasks ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS traffic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES traffic_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indizes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_traffic_target_groups_active ON traffic_target_groups(active);
CREATE INDEX IF NOT EXISTS idx_traffic_search_profiles_group ON traffic_search_profiles(target_group_id);
CREATE INDEX IF NOT EXISTS idx_outreach_drafts_status ON outreach_drafts(status);
CREATE INDEX IF NOT EXISTS idx_content_ideas_status ON content_ideas(status);
CREATE INDEX IF NOT EXISTS idx_traffic_campaigns_status ON traffic_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_traffic_tasks_status ON traffic_tasks(status);
CREATE INDEX IF NOT EXISTS idx_traffic_tasks_due_date ON traffic_tasks(due_date);

-- ─── updated_at Trigger ──────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS traffic_target_groups_updated_at ON traffic_target_groups;
CREATE TRIGGER traffic_target_groups_updated_at
  BEFORE UPDATE ON traffic_target_groups
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS outreach_drafts_updated_at ON outreach_drafts;
CREATE TRIGGER outreach_drafts_updated_at
  BEFORE UPDATE ON outreach_drafts
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS content_ideas_updated_at ON content_ideas;
CREATE TRIGGER content_ideas_updated_at
  BEFORE UPDATE ON content_ideas
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS traffic_campaigns_updated_at ON traffic_campaigns;
CREATE TRIGGER traffic_campaigns_updated_at
  BEFORE UPDATE ON traffic_campaigns
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS traffic_tasks_updated_at ON traffic_tasks;
CREATE TRIGGER traffic_tasks_updated_at
  BEFORE UPDATE ON traffic_tasks
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

-- ─── RLS (nur authenticated) ─────────────────────────────────────────────────

ALTER TABLE traffic_target_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_search_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage traffic_target_groups" ON traffic_target_groups;
CREATE POLICY "Authenticated manage traffic_target_groups"
  ON traffic_target_groups FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage traffic_search_profiles" ON traffic_search_profiles;
CREATE POLICY "Authenticated manage traffic_search_profiles"
  ON traffic_search_profiles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage outreach_drafts" ON outreach_drafts;
CREATE POLICY "Authenticated manage outreach_drafts"
  ON outreach_drafts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage content_ideas" ON content_ideas;
CREATE POLICY "Authenticated manage content_ideas"
  ON content_ideas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage traffic_campaigns" ON traffic_campaigns;
CREATE POLICY "Authenticated manage traffic_campaigns"
  ON traffic_campaigns FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage traffic_tasks" ON traffic_tasks;
CREATE POLICY "Authenticated manage traffic_tasks"
  ON traffic_tasks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON
  traffic_target_groups,
  traffic_search_profiles,
  outreach_drafts,
  content_ideas,
  traffic_campaigns,
  traffic_tasks
TO authenticated;

-- ─── Standard-Zielgruppen ───────────────────────────────────────────────────

INSERT INTO traffic_target_groups (name, description, industry, company_size, pain_points, value_proposition, priority)
SELECT * FROM (VALUES
  ('IT-Systemhäuser', 'MSP-artige IT-Dienstleister mit KMU-Kunden', 'IT-Systemhaus', '10–250 MA',
   'NIS2-Dokumentation für Kunden, Audit-Vorbereitung, fehlende Compliance-Templates',
   'White-Label-fähiges NIS2 Control Center für Kundenprojekte', 'high'),
  ('MSPs', 'Managed Service Provider mit Microsoft-365-Fokus', 'MSP', '10–500 MA',
   'Skalierbare Compliance-Dokumentation, wiederkehrende Audit-Anforderungen',
   'Schnelle NIS2-Dokumente + Audit-Ordner-Export für Kunden', 'high'),
  ('Datenschutzberater', 'Externe DSB und Datenschutz-Consultants', 'Datenschutz', '1–50 MA',
   'NIS2-Überschneidung mit DSGVO, fehlende IT-Security-Dokumente',
   'Ergänzung zum Datenschutz-Portfolio mit NIS2-Dokumentgenerator', 'high'),
  ('Compliance-Berater', 'GRC- und Compliance-Beratung', 'Compliance', '5–100 MA',
   'Kunden brauchen NIS2-Nachweise, manuelle Dokumentenerstellung',
   'Strukturierte Audit-Ordner und Compliance-Score für Beratungsmandate', 'high'),
  ('Mittelstand mit Microsoft 365', 'KMU mit M365, oft ohne dedizierte IT-Security', 'Allgemein', '50–500 MA',
   'Unklare NIS2-Betroffenheit, fehlende Policies, Audit-Druck',
   'Betroffenheitscheck + Dokumente + Audit-Paket aus einer Hand', 'medium'),
  ('ICT-Dienstleister', 'Telekommunikation und ICT nach NIS2', 'ICT-Dienstleistungen', '100+ MA',
   'Meldepflichten, Risikoanalyse, Lieferketten-Themen',
   'NIS2 Control Center für ICT-relevante Dokumentation', 'high'),
  ('Produktionsunternehmen', 'Industrie mit OT/IT-Schnittstelle', 'Industrie', '100–1000 MA',
   'KRITIS-Nähe, Lieferanten-Compliance, Incident-Prozesse',
   'Incident-Response-Plan, Risikoanalyse, Audit-Ordner', 'medium'),
  ('Logistikunternehmen', 'Transport und Logistik mit digitalen Systemen', 'Logistik', '50–500 MA',
   'Lieferketten-Sicherheit, NIS2-Betroffenheit unklar',
   'Betroffenheitscheck und Maßnahmenplan für Logistik', 'medium'),
  ('Gesundheitsnahe Dienstleister', 'Gesundheitswesen und nahe Branchen', 'Gesundheitswesen', '20–500 MA',
   'Hohe Regulierungsdichte, Datenschutz + NIS2',
   'Dokumentation für Gesundheits-IT und Compliance', 'medium')
) AS v(name, description, industry, company_size, pain_points, value_proposition, priority)
WHERE NOT EXISTS (SELECT 1 FROM traffic_target_groups LIMIT 1);
