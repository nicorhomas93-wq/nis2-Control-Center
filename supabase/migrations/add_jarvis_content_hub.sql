-- Jarvis Content Hub — LinkedIn, Serien, Kalender (kein Auto-Posting)

CREATE TABLE IF NOT EXISTS content_hub_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL,
  hub_area TEXT NOT NULL DEFAULT 'campaign_series',
  description TEXT,
  day_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_hub_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES content_hub_series(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  hub_area TEXT NOT NULL DEFAULT 'linkedin_posts',
  format TEXT NOT NULL DEFAULT 'standard_post',
  hook TEXT,
  body TEXT NOT NULL,
  call_to_action TEXT,
  poll_question TEXT,
  poll_options JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_date DATE,
  day_number INTEGER,
  word_count INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_hub_series_slug ON content_hub_series(slug);
CREATE INDEX IF NOT EXISTS idx_content_hub_posts_category ON content_hub_posts(category);
CREATE INDEX IF NOT EXISTS idx_content_hub_posts_hub_area ON content_hub_posts(hub_area);
CREATE INDEX IF NOT EXISTS idx_content_hub_posts_scheduled ON content_hub_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_hub_posts_series ON content_hub_posts(series_id);

DROP TRIGGER IF EXISTS content_hub_series_updated_at ON content_hub_series;
CREATE TRIGGER content_hub_series_updated_at
  BEFORE UPDATE ON content_hub_series
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS content_hub_posts_updated_at ON content_hub_posts;
CREATE TRIGGER content_hub_posts_updated_at
  BEFORE UPDATE ON content_hub_posts
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

ALTER TABLE content_hub_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_hub_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage content_hub_series" ON content_hub_series;
CREATE POLICY "Authenticated manage content_hub_series"
  ON content_hub_series FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage content_hub_posts" ON content_hub_posts;
CREATE POLICY "Authenticated manage content_hub_posts"
  ON content_hub_posts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE content_hub_posts IS 'Jarvis Content Hub — manuell posten, kein Auto-Versand';
