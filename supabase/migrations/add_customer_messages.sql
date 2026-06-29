-- Pro-Kunde-Nachrichten (E-Mail, WhatsApp, internes Log)

CREATE TABLE IF NOT EXISTS customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'logged',
  recipient_email TEXT,
  recipient_phone TEXT,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_messages_entity
  ON customer_messages(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_messages_created_at
  ON customer_messages(created_at DESC);

ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage customer_messages" ON customer_messages;
CREATE POLICY "Authenticated manage customer_messages"
  ON customer_messages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON customer_messages TO authenticated;
