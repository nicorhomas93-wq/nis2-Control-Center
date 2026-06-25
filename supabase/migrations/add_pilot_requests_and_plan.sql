-- Pilot requests + plan/role fields for pilot phase
-- Im Supabase SQL Editor ausführen, wenn Pilotanfragen fehlschlagen.

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

ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pilot';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pilot';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_pilot_requests_created_at ON pilot_requests(created_at DESC);
