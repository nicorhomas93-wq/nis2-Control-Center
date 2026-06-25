-- Follow-up Lifecycle System
ALTER TABLE acquisition_leads ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'check_complete';
ALTER TABLE acquisition_leads ADD COLUMN IF NOT EXISTS sequence_id text NOT NULL DEFAULT 'standard_nurture';
ALTER TABLE acquisition_leads ADD COLUMN IF NOT EXISTS converted_at timestamptz;
ALTER TABLE acquisition_leads ADD COLUMN IF NOT EXISTS high_intent_at timestamptz;
ALTER TABLE acquisition_leads ADD COLUMN IF NOT EXISTS email_link_clicked_at timestamptz;
ALTER TABLE acquisition_leads ADD COLUMN IF NOT EXISTS last_trigger text;
ALTER TABLE acquisition_leads ADD COLUMN IF NOT EXISTS strong_cta boolean NOT NULL DEFAULT false;

ALTER TABLE acquisition_email_queue ADD COLUMN IF NOT EXISTS sequence_id text NOT NULL DEFAULT 'standard_nurture';
ALTER TABLE acquisition_email_queue ADD COLUMN IF NOT EXISTS email_key text;
ALTER TABLE acquisition_email_queue ADD COLUMN IF NOT EXISTS track_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_acquisition_leads_lifecycle ON acquisition_leads(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_acquisition_email_queue_token ON acquisition_email_queue(track_token) WHERE track_token IS NOT NULL;
