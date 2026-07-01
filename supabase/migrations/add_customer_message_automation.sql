-- Automatische Kunden-Nachrichten: Einstellungen, Trigger-Metadaten

ALTER TABLE customer_messages
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS trigger_type TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_messages_trigger
  ON customer_messages(entity_type, entity_id, trigger_type, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_message_automation (
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  auto_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_type, entity_id)
);

ALTER TABLE customer_message_automation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage customer_message_automation" ON customer_message_automation;
CREATE POLICY "Authenticated manage customer_message_automation"
  ON customer_message_automation FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON customer_message_automation TO authenticated;
