-- TKND NIS2 – Komplettes Setup (einmal im SQL Editor ausführen)
-- https://supabase.com/dashboard/project/hmyeguskotcydmodoedr/sql/new

-- 1) Alte Tabellen entfernen
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS audit_exports CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS measures CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS nis2_assessments CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 2) Schema v2 anlegen (siehe schema.sql)
-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT,
  industry TEXT,
  employee_count INTEGER,
  annual_revenue NUMERIC,
  balance_sheet_total NUMERIC,
  country TEXT DEFAULT 'DE',
  eu_operations BOOLEAN DEFAULT FALSE,
  uses_microsoft_365 BOOLEAN DEFAULT FALSE,
  uses_cloud_services BOOLEAN DEFAULT FALSE,
  critical_business_processes TEXT,
  has_it_service_provider BOOLEAN DEFAULT FALSE,
  publicly_accessible_systems BOOLEAN DEFAULT FALSE,
  security_contact_name TEXT,
  security_contact_email TEXT,
  nis2_status TEXT DEFAULT 'unbekannt',
  compliance_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nis2_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  result TEXT NOT NULL,
  reasoning TEXT,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'published',
  version INTEGER DEFAULT 1,
  generation_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  responsible TEXT,
  target_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  asset TEXT NOT NULL,
  threat TEXT NOT NULL,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('high', 'medium', 'low')),
  measure TEXT,
  analysis_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  report_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  export_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_assessments_company_id ON nis2_assessments(company_id);
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_measures_company_id ON measures(company_id);
CREATE INDEX idx_risks_company_id ON risks(company_id);
CREATE INDEX idx_incidents_company_id ON incidents(company_id);
CREATE INDEX idx_audit_exports_company_id ON audit_exports(company_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE nis2_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users manage own company" ON companies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own assessments" ON nis2_assessments FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own documents" ON documents FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own measures" ON measures FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own risks" ON risks FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own incidents" ON incidents FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own audit exports" ON audit_exports FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER measures_updated_at BEFORE UPDATE ON measures FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER risks_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$ BEGIN INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT (id) DO NOTHING; RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
