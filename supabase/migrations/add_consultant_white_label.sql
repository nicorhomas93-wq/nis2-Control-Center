-- White-Label für Consultant / Systemhaus

CREATE TABLE IF NOT EXISTS consultant_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  white_label_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  display_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#dbeafe',
  accent_color TEXT DEFAULT '#60a5fa',
  email_sender_name TEXT,
  support_email TEXT,
  custom_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultant_settings_enabled
  ON consultant_settings(white_label_enabled)
  WHERE white_label_enabled = TRUE;

ALTER TABLE consultant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own consultant settings" ON consultant_settings;
CREATE POLICY "Users manage own consultant settings"
  ON consultant_settings FOR ALL
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid() AND is_mandant = FALSE
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid() AND is_mandant = FALSE
    )
  );

DROP TRIGGER IF EXISTS consultant_settings_updated_at ON consultant_settings;
CREATE TRIGGER consultant_settings_updated_at
  BEFORE UPDATE ON consultant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage für Logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding-logos',
  'branding-logos',
  TRUE,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own branding logos" ON storage.objects;
CREATE POLICY "Users upload own branding logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own branding logos" ON storage.objects;
CREATE POLICY "Users update own branding logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branding-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own branding logos" ON storage.objects;
CREATE POLICY "Users delete own branding logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branding-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Public read branding logos" ON storage.objects;
CREATE POLICY "Public read branding logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding-logos');
