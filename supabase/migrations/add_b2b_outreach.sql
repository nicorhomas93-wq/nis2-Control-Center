-- B2B Outreach Pipeline — Leads, Analyse, personalisierte Nachrichten (manueller Versand)

CREATE TABLE IF NOT EXISTS b2b_outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  employee_count TEXT,
  contact_name TEXT,
  contact_role TEXT,
  contact_email TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  nis2_likelihood TEXT NOT NULL DEFAULT 'uncertain',
  it_maturity TEXT NOT NULL DEFAULT 'unknown',
  analysis_bullets JSONB NOT NULL DEFAULT '[]'::jsonb,
  observation TEXT,
  outreach_message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  processed_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_status ON b2b_outreach_leads(status);
CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_created_at ON b2b_outreach_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_processed_at ON b2b_outreach_leads(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_company ON b2b_outreach_leads(company_name);

DROP TRIGGER IF EXISTS b2b_outreach_leads_updated_at ON b2b_outreach_leads;
CREATE TRIGGER b2b_outreach_leads_updated_at
  BEFORE UPDATE ON b2b_outreach_leads
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

ALTER TABLE b2b_outreach_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage b2b_outreach_leads" ON b2b_outreach_leads;
CREATE POLICY "Authenticated manage b2b_outreach_leads"
  ON b2b_outreach_leads FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON b2b_outreach_leads TO authenticated;
