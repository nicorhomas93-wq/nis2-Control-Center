-- Webhook-gesteuert: bezahlter Stripe-Abo-Zugang
ALTER TABLE companies ADD COLUMN IF NOT EXISTS access_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_access_enabled ON companies(access_enabled);
