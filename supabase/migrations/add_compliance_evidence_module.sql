-- Schulungen & Nachweise: zentrales Compliance-Nachweismodul

CREATE TABLE IF NOT EXISTS compliance_evidence_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'sonstige' CHECK (
    category IN (
      'schulungen',
      'phishing_awareness',
      'mfa_zugriff',
      'backup_wiederherstellung',
      'incident_response',
      'lieferanten',
      'richtlinien',
      'audit',
      'sonstige'
    )
  ),
  entry_type TEXT NOT NULL DEFAULT 'sonstiges' CHECK (
    entry_type IN (
      'schulung',
      'teilnahmebestaetigung',
      'phishing_auswertung',
      'mfa_nachweis',
      'backup_nachweis',
      'incident_nachweis',
      'lieferanten_nachweis',
      'richtlinie',
      'audit_beleg',
      'sonstiges'
    )
  ),
  description TEXT,
  conducted_at DATE,
  responsible TEXT,
  valid_until TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'unvollstaendig' CHECK (
    status IN (
      'vollstaendig',
      'unvollstaendig',
      'nachweis_fehlt',
      'review_faellig',
      'abgelaufen',
      'freiwillig_dokumentiert',
      'nicht_zutreffend'
    )
  ),
  mandatory_relevance TEXT NOT NULL DEFAULT 'nis2_dependent' CHECK (
    mandatory_relevance IN ('yes', 'no', 'nis2_dependent')
  ),
  external_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_risk_ids UUID[] NOT NULL DEFAULT '{}',
  linked_measure_ids UUID[] NOT NULL DEFAULT '{}',
  linked_task_ids UUID[] NOT NULL DEFAULT '{}',
  linked_vendor_ids UUID[] NOT NULL DEFAULT '{}',
  linked_audit_areas TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS compliance_evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES compliance_evidence_entries(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  file_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_compliance_evidence_entries_company
  ON compliance_evidence_entries(company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_evidence_entries_category
  ON compliance_evidence_entries(company_id, category)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_evidence_entries_review
  ON compliance_evidence_entries(next_review_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_evidence_files_entry
  ON compliance_evidence_files(entry_id, is_current);

CREATE INDEX IF NOT EXISTS idx_compliance_evidence_files_company
  ON compliance_evidence_files(company_id);

DROP TRIGGER IF EXISTS compliance_evidence_entries_updated_at ON compliance_evidence_entries;
CREATE TRIGGER compliance_evidence_entries_updated_at
  BEFORE UPDATE ON compliance_evidence_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE compliance_evidence_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read compliance evidence entries" ON compliance_evidence_entries;
CREATE POLICY "Members read compliance evidence entries" ON compliance_evidence_entries FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Writers insert compliance evidence entries" ON compliance_evidence_entries;
CREATE POLICY "Writers insert compliance evidence entries" ON compliance_evidence_entries FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));

DROP POLICY IF EXISTS "Writers update compliance evidence entries" ON compliance_evidence_entries;
CREATE POLICY "Writers update compliance evidence entries" ON compliance_evidence_entries FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));

DROP POLICY IF EXISTS "Writers delete compliance evidence entries" ON compliance_evidence_entries;
CREATE POLICY "Writers delete compliance evidence entries" ON compliance_evidence_entries FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Members read compliance evidence files" ON compliance_evidence_files;
CREATE POLICY "Members read compliance evidence files" ON compliance_evidence_files FOR SELECT
  TO authenticated USING (can_access_company(company_id));

DROP POLICY IF EXISTS "Writers manage compliance evidence files" ON compliance_evidence_files;
CREATE POLICY "Writers insert compliance evidence files" ON compliance_evidence_files FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));

CREATE POLICY "Writers update compliance evidence files" ON compliance_evidence_files FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));

CREATE POLICY "Writers delete compliance evidence files" ON compliance_evidence_files FOR DELETE
  TO authenticated USING (can_write_company(company_id));

GRANT ALL ON compliance_evidence_entries, compliance_evidence_files TO authenticated;

-- Storage-Bucket für Nachweisdateien
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-evidence',
  'compliance-evidence',
  FALSE,
  26214400,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg',
    'text/plain',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Company members read compliance evidence files" ON storage.objects;
CREATE POLICY "Company members read compliance evidence files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'compliance-evidence'
    AND can_access_company(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Company writers upload compliance evidence files" ON storage.objects;
CREATE POLICY "Company writers upload compliance evidence files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-evidence'
    AND can_write_company(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Company writers update compliance evidence files" ON storage.objects;
CREATE POLICY "Company writers update compliance evidence files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'compliance-evidence'
    AND can_write_company(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Company writers delete compliance evidence files" ON storage.objects;
CREATE POLICY "Company writers delete compliance evidence files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'compliance-evidence'
    AND can_write_company(((storage.foldername(name))[1])::uuid)
  );
