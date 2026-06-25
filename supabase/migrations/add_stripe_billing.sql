-- Stripe Billing: companies billing fields + billing_events audit log
-- Im Supabase SQL Editor ausführen.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_email text;

CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_company_id ON billing_events(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id ON companies(stripe_customer_id);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own billing events" ON billing_events;
CREATE POLICY "Users read own billing events"
  ON billing_events FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

-- Inserts/Updates nur über Service Role (Webhooks) — keine Client-Policies
