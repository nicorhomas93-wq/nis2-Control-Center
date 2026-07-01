-- Lieferanten- und Dienstleistermodul mit Nachweisen und versionierten Bewertungen

CREATE TABLE IF NOT EXISTS company_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  website TEXT,
  description TEXT,
  criticality TEXT NOT NULL DEFAULT 'medium' CHECK (
    criticality IN ('low', 'medium', 'high', 'critical')
  ),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (
    risk_level IN ('low', 'medium', 'high', 'critical')
  ),
  vendor_score INTEGER NOT NULL DEFAULT 0 CHECK (vendor_score >= 0 AND vendor_score <= 100),
  processes_personal_data BOOLEAN NOT NULL DEFAULT FALSE,
  last_assessed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deletion_reason TEXT,
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS vendor_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES company_vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN (
      'iso_27001',
      'tisax',
      'datenschutzvereinbarung',
      'av_vertrag',
      'toms',
      'sla',
      'notfallkonzept',
      'versicherungsnachweis',
      'selbstauskunft',
      'other'
    )
  ),
  status TEXT NOT NULL DEFAULT 'missing' CHECK (
    status IN ('present', 'missing', 'expired', 'review_due')
  ),
  valid_until TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  file_name TEXT,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, evidence_type)
);

CREATE TABLE IF NOT EXISTS vendor_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES company_vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criticality TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  vendor_score INTEGER NOT NULL DEFAULT 0 CHECK (vendor_score >= 0 AND vendor_score <= 100),
  questionnaire_score INTEGER NOT NULL DEFAULT 0 CHECK (questionnaire_score >= 0 AND questionnaire_score <= 100),
  evidence_score INTEGER NOT NULL DEFAULT 0 CHECK (evidence_score >= 0 AND evidence_score <= 100),
  questionnaire_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, version)
);

CREATE INDEX IF NOT EXISTS idx_company_vendors_company ON company_vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_company_vendors_next_review ON company_vendors(next_review_at)
  WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_vendor_evidence_vendor ON vendor_evidence(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_evidence_company ON vendor_evidence(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_vendor ON vendor_assessments(vendor_id, version DESC);

DROP TRIGGER IF EXISTS company_vendors_updated_at ON company_vendors;
CREATE TRIGGER company_vendors_updated_at
  BEFORE UPDATE ON company_vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS vendor_evidence_updated_at ON vendor_evidence;
CREATE TRIGGER vendor_evidence_updated_at
  BEFORE UPDATE ON vendor_evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE company_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read company vendors" ON company_vendors;
CREATE POLICY "Members read company vendors" ON company_vendors FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);
DROP POLICY IF EXISTS "Writers insert company vendors" ON company_vendors;
CREATE POLICY "Writers insert company vendors" ON company_vendors FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
DROP POLICY IF EXISTS "Writers update company vendors" ON company_vendors;
CREATE POLICY "Writers update company vendors" ON company_vendors FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
DROP POLICY IF EXISTS "Writers delete company vendors" ON company_vendors;
CREATE POLICY "Writers delete company vendors" ON company_vendors FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Members read vendor evidence" ON vendor_evidence;
CREATE POLICY "Members read vendor evidence" ON vendor_evidence FOR SELECT
  TO authenticated USING (can_access_company(company_id));
DROP POLICY IF EXISTS "Writers manage vendor evidence" ON vendor_evidence;
CREATE POLICY "Writers insert vendor evidence" ON vendor_evidence FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update vendor evidence" ON vendor_evidence FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete vendor evidence" ON vendor_evidence FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Members read vendor assessments" ON vendor_assessments;
CREATE POLICY "Members read vendor assessments" ON vendor_assessments FOR SELECT
  TO authenticated USING (can_access_company(company_id));
DROP POLICY IF EXISTS "Writers insert vendor assessments" ON vendor_assessments;
CREATE POLICY "Writers insert vendor assessments" ON vendor_assessments FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));

GRANT ALL ON company_vendors, vendor_evidence, vendor_assessments TO authenticated;
