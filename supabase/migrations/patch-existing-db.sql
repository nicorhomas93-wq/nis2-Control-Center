-- Patch für bestehende TKND NIS2 Datenbank
-- Im Supabase SQL Editor ausführen: https://supabase.com/dashboard/project/hmyeguskotcydmodoedr/sql

ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
UPDATE documents SET version = 1 WHERE version IS NULL;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS generation_mode TEXT;

-- Pilotanfragen (öffentliches Formular)
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

ALTER TABLE pilot_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit pilot request" ON pilot_requests;
CREATE POLICY "Anyone can submit pilot request"
  ON pilot_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON pilot_requests TO anon, authenticated;

-- Jarvis Sales (siehe add_jarvis_sales.sql für vollständiges Schema)
DROP POLICY IF EXISTS "Authenticated read pilot requests" ON pilot_requests;
CREATE POLICY "Authenticated read pilot requests"
  ON pilot_requests FOR SELECT
  TO authenticated
  USING (true);
GRANT SELECT ON pilot_requests TO authenticated;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pilot';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pilot';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_pilot_requests_created_at ON pilot_requests(created_at DESC);

-- Incident Response: node scripts/run-migrations.mjs (add_incident_response_fields.sql)
