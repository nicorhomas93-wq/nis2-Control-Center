-- Jarvis LinkedIn Publishing — Content-Management, manuelles Veröffentlichen

CREATE TABLE IF NOT EXISTS linkedin_publishing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_member_id TEXT,
  profile_name TEXT,
  profile_picture_url TEXT,
  profile_headline TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS linkedin_publishing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_hub_post_id UUID REFERENCES content_hub_posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'short_post',
  body_text TEXT NOT NULL,
  image_url TEXT,
  image_storage_path TEXT,
  target_audience TEXT,
  call_to_action TEXT,
  hashtags TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  linkedin_post_urn TEXT,
  reach_views INTEGER NOT NULL DEFAULT 0,
  response_count INTEGER NOT NULL DEFAULT 0,
  publish_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_publishing_posts_user ON linkedin_publishing_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_publishing_posts_status ON linkedin_publishing_posts(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_publishing_posts_scheduled ON linkedin_publishing_posts(scheduled_at);

DROP TRIGGER IF EXISTS linkedin_publishing_accounts_updated_at ON linkedin_publishing_accounts;
CREATE TRIGGER linkedin_publishing_accounts_updated_at
  BEFORE UPDATE ON linkedin_publishing_accounts
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

DROP TRIGGER IF EXISTS linkedin_publishing_posts_updated_at ON linkedin_publishing_posts;
CREATE TRIGGER linkedin_publishing_posts_updated_at
  BEFORE UPDATE ON linkedin_publishing_posts
  FOR EACH ROW EXECUTE FUNCTION jarvis_set_updated_at();

ALTER TABLE linkedin_publishing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_publishing_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage linkedin_publishing_accounts" ON linkedin_publishing_accounts;
CREATE POLICY "Authenticated manage linkedin_publishing_accounts"
  ON linkedin_publishing_accounts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage linkedin_publishing_posts" ON linkedin_publishing_posts;
CREATE POLICY "Authenticated manage linkedin_publishing_posts"
  ON linkedin_publishing_posts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'linkedin-media',
  'linkedin-media',
  TRUE,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated upload linkedin media" ON storage.objects;
CREATE POLICY "Authenticated upload linkedin media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'linkedin-media');

DROP POLICY IF EXISTS "Authenticated read linkedin media" ON storage.objects;
CREATE POLICY "Authenticated read linkedin media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'linkedin-media');

DROP POLICY IF EXISTS "Authenticated update linkedin media" ON storage.objects;
CREATE POLICY "Authenticated update linkedin media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'linkedin-media');

DROP POLICY IF EXISTS "Public read linkedin media" ON storage.objects;
CREATE POLICY "Public read linkedin media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'linkedin-media');

COMMENT ON TABLE linkedin_publishing_posts IS 'Jarvis LinkedIn Publishing — Veröffentlichung nur per explizitem Klick';
