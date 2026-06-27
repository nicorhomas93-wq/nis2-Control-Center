-- TKND NIS2 Control Center – Supabase Schema v2
-- Im Supabase SQL Editor ausführen (bestehende Tabellen ggf. zuerst droppen)

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  plan TEXT DEFAULT 'pilot',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Besitzer (owner)
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
  plan TEXT DEFAULT 'pilot',
  role TEXT DEFAULT 'user',
  is_demo BOOLEAN DEFAULT FALSE,
  is_mandant BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NIS2 ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS nis2_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  result TEXT NOT NULL,
  reasoning TEXT,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
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

-- ============================================================
-- MEASURES
-- ============================================================
CREATE TABLE IF NOT EXISTS measures (
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

-- ============================================================
-- RISKS
-- ============================================================
CREATE TABLE IF NOT EXISTS risks (
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

-- ============================================================
-- INCIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  report_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT EXPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  export_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PILOT REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS pilot_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDIZES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS companies_user_own_unique
  ON companies (user_id)
  WHERE is_mandant = FALSE;
CREATE INDEX IF NOT EXISTS companies_mandanten_by_user
  ON companies (user_id)
  WHERE is_mandant = TRUE;
CREATE INDEX IF NOT EXISTS idx_assessments_company_id ON nis2_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_measures_company_id ON measures(company_id);
CREATE INDEX IF NOT EXISTS idx_risks_company_id ON risks(company_id);
CREATE INDEX IF NOT EXISTS idx_incidents_company_id ON incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_exports_company_id ON audit_exports(company_id);
CREATE INDEX IF NOT EXISTS idx_pilot_requests_created_at ON pilot_requests(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE nis2_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_requests ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Companies
CREATE POLICY "Users manage own company"
  ON companies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Child tables via company ownership
CREATE POLICY "Users manage own assessments"
  ON nis2_assessments FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own documents"
  ON documents FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own measures"
  ON measures FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own risks"
  ON risks FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own incidents"
  ON incidents FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own audit exports"
  ON audit_exports FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can submit pilot request"
  ON pilot_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON pilot_requests TO anon, authenticated;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER measures_updated_at
  BEFORE UPDATE ON measures FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER risks_updated_at
  BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
