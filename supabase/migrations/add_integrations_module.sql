-- Integrations- und Schnittstellenmodul (Mandantenfähig)

CREATE TABLE IF NOT EXISTS integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('active', 'prepared', 'error', 'coming_soon')),
  icon TEXT,
  auth_type TEXT NOT NULL DEFAULT 'api_key',
  supported_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('active', 'prepared', 'disabled', 'error')),
  auth_type TEXT NOT NULL,
  base_url TEXT,
  client_id TEXT,
  encrypted_client_secret TEXT,
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  api_key_encrypted TEXT,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS integration_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  source_object TEXT NOT NULL,
  target_object TEXT NOT NULL,
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  transformation_rule TEXT,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES integration_connections(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound', 'bidirectional')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'partial', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_called_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant ON integration_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_provider ON integration_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_mappings_tenant ON integration_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_runs_tenant ON integration_sync_runs(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_tenant ON integration_webhooks(tenant_id);

DROP TRIGGER IF EXISTS integration_providers_updated_at ON integration_providers;
CREATE TRIGGER integration_providers_updated_at
  BEFORE UPDATE ON integration_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS integration_connections_updated_at ON integration_connections;
CREATE TRIGGER integration_connections_updated_at
  BEFORE UPDATE ON integration_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS integration_mappings_updated_at ON integration_mappings;
CREATE TRIGGER integration_mappings_updated_at
  BEFORE UPDATE ON integration_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS integration_webhooks_updated_at ON integration_webhooks;
CREATE TRIGGER integration_webhooks_updated_at
  BEFORE UPDATE ON integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated read providers" ON integration_providers;
CREATE POLICY "All authenticated read providers"
  ON integration_providers FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Members read integration connections" ON integration_connections;
CREATE POLICY "Members read integration connections"
  ON integration_connections FOR SELECT TO authenticated
  USING (can_access_company(tenant_id));
DROP POLICY IF EXISTS "Writers manage integration connections" ON integration_connections;
CREATE POLICY "Writers insert integration connections"
  ON integration_connections FOR INSERT TO authenticated
  WITH CHECK (can_write_company(tenant_id));
CREATE POLICY "Writers update integration connections"
  ON integration_connections FOR UPDATE TO authenticated
  USING (can_write_company(tenant_id))
  WITH CHECK (can_write_company(tenant_id));
CREATE POLICY "Writers delete integration connections"
  ON integration_connections FOR DELETE TO authenticated
  USING (can_write_company(tenant_id));

DROP POLICY IF EXISTS "Members read integration mappings" ON integration_mappings;
CREATE POLICY "Members read integration mappings"
  ON integration_mappings FOR SELECT TO authenticated
  USING (can_access_company(tenant_id));
DROP POLICY IF EXISTS "Writers manage integration mappings" ON integration_mappings;
CREATE POLICY "Writers insert integration mappings"
  ON integration_mappings FOR INSERT TO authenticated
  WITH CHECK (can_write_company(tenant_id));
CREATE POLICY "Writers update integration mappings"
  ON integration_mappings FOR UPDATE TO authenticated
  USING (can_write_company(tenant_id))
  WITH CHECK (can_write_company(tenant_id));
CREATE POLICY "Writers delete integration mappings"
  ON integration_mappings FOR DELETE TO authenticated
  USING (can_write_company(tenant_id));

DROP POLICY IF EXISTS "Members read integration sync runs" ON integration_sync_runs;
CREATE POLICY "Members read integration sync runs"
  ON integration_sync_runs FOR SELECT TO authenticated
  USING (can_access_company(tenant_id));
DROP POLICY IF EXISTS "Writers manage integration sync runs" ON integration_sync_runs;
CREATE POLICY "Writers insert integration sync runs"
  ON integration_sync_runs FOR INSERT TO authenticated
  WITH CHECK (can_write_company(tenant_id));
CREATE POLICY "Writers update integration sync runs"
  ON integration_sync_runs FOR UPDATE TO authenticated
  USING (can_write_company(tenant_id))
  WITH CHECK (can_write_company(tenant_id));
CREATE POLICY "Writers delete integration sync runs"
  ON integration_sync_runs FOR DELETE TO authenticated
  USING (can_write_company(tenant_id));

DROP POLICY IF EXISTS "Members read integration webhooks" ON integration_webhooks;
CREATE POLICY "Members read integration webhooks"
  ON integration_webhooks FOR SELECT TO authenticated
  USING (can_access_company(tenant_id));
DROP POLICY IF EXISTS "Writers manage integration webhooks" ON integration_webhooks;
CREATE POLICY "Writers insert integration webhooks"
  ON integration_webhooks FOR INSERT TO authenticated
  WITH CHECK (can_write_company(tenant_id));
CREATE POLICY "Writers update integration webhooks"
  ON integration_webhooks FOR UPDATE TO authenticated
  USING (can_write_company(tenant_id))
  WITH CHECK (can_write_company(tenant_id));
CREATE POLICY "Writers delete integration webhooks"
  ON integration_webhooks FOR DELETE TO authenticated
  USING (can_write_company(tenant_id));

GRANT ALL ON integration_providers, integration_connections, integration_mappings, integration_sync_runs, integration_webhooks TO authenticated;

INSERT INTO integration_providers (name, key, category, description, status, icon, auth_type, supported_actions)
VALUES
  ('Microsoft 365', 'microsoft365', 'Identity / Collaboration / Documents', 'Benutzer aus Entra ID importieren, SharePoint-Nachweise verknüpfen, Teams/Outlook anbinden.', 'prepared', 'microsoft', 'oauth2', '["users.import","groups.import","sharepoint.evidence","teams.notify","outlook.mail"]'::jsonb),
  ('Jira', 'jira', 'Ticketing / Aufgabenmanagement', 'Maßnahmen und Incidents als Jira-Issues synchronisieren.', 'prepared', 'jira', 'api_token', '["tasks.push","tasks.status.pull","incidents.push","mapping.status"]'::jsonb),
  ('SAP', 'sap', 'ERP / Stammdaten / Lieferanten / Prozesse', 'Generische SAP-Endpunkte (OData/REST) für Lieferanten, Prozesse und Assets.', 'prepared', 'sap', 'oauth2', '["suppliers.import","org_units.import","processes.import","assets.import"]'::jsonb),
  ('ServiceNow', 'servicenow', 'ITSM / Incident / GRC', 'Maßnahmen und Sicherheitsvorfälle mit ServiceNow synchronisieren.', 'prepared', 'servicenow', 'oauth2', '["tasks.push","incidents.push","status.pull","grc.sync"]'::jsonb),
  ('CSV / Excel Import', 'csv_excel', 'Import / Export', 'Stammdaten und Nachweise per Datei importieren.', 'active', 'file-spreadsheet', 'file_import', '["suppliers.import","users.import","departments.import","assets.import","risks.import","measures.import","evidence.import"]'::jsonb),
  ('REST API', 'rest_api', 'Developer / API', 'Programmatische Schnittstelle für externe Systeme.', 'prepared', 'plug', 'api_key', '["suppliers.api","assets.api","tasks.api","risks.api","incidents.api","evidence.api","users.api"]'::jsonb),
  ('Webhooks', 'webhooks', 'Automation', 'TKND-Ereignisse an externe Systeme senden.', 'prepared', 'webhook', 'webhook_secret', '["task.created","task.updated","task.completed","risk.created","risk.updated","incident.created","supplier.created","supplier.risk_changed","evidence.uploaded","audit.export_created"]'::jsonb),
  ('Entra ID / Azure AD', 'entra_id', 'Identity', 'Benutzer, Gruppen und Abteilungen aus Entra ID synchronisieren.', 'prepared', 'key-round', 'oauth2', '["users.import","groups.import","departments.import","roles.import"]'::jsonb),
  ('SharePoint', 'sharepoint', 'Documents', 'Audit- und Nachweisdokumente aus SharePoint verknüpfen.', 'prepared', 'folder-sync', 'oauth2', '["evidence.link","documents.import","audit.export"]'::jsonb),
  ('Teams', 'teams', 'Collaboration', 'Benachrichtigungen und Management-Updates in Teams senden.', 'prepared', 'messages-square', 'webhook_secret', '["notifications.send","reports.send"]'::jsonb),
  ('Outlook', 'outlook', 'Communication', 'Berichte und Aufgabenbenachrichtigungen per Outlook senden.', 'prepared', 'mail', 'oauth2', '["reports.mail","tasks.mail"]'::jsonb),
  ('DATEV', 'datev', 'ERP / Finance', 'Stammdaten- und Prozessintegration mit DATEV vorbereiten.', 'prepared', 'landmark', 'api_key', '["org_units.import","vendors.import","documents.link"]'::jsonb)
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  icon = EXCLUDED.icon,
  auth_type = EXCLUDED.auth_type,
  supported_actions = EXCLUDED.supported_actions,
  updated_at = NOW();
