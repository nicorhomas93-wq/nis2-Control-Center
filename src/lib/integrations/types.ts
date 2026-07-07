export type IntegrationStatus = "active" | "prepared" | "disabled" | "error" | "coming_soon";
export type IntegrationAuthType =
  | "api_key"
  | "basic_auth"
  | "oauth2"
  | "bearer_token"
  | "webhook_secret"
  | "file_import"
  | "api_token";

export interface IntegrationProvider {
  id: string;
  name: string;
  key: string;
  category: string;
  description: string | null;
  status: IntegrationStatus;
  icon: string | null;
  auth_type: IntegrationAuthType | string;
  supported_actions: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConnection {
  id: string;
  tenant_id: string;
  provider_id: string;
  name: string;
  status: IntegrationStatus;
  auth_type: IntegrationAuthType | string;
  base_url: string | null;
  client_id: string | null;
  encrypted_client_secret: string | null;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  api_key_encrypted: string | null;
  config_json: Record<string, unknown> | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationMapping {
  id: string;
  tenant_id: string;
  connection_id: string;
  source_object: string;
  target_object: string;
  source_field: string;
  target_field: string;
  transformation_rule: string | null;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSyncRun {
  id: string;
  tenant_id: string;
  connection_id: string | null;
  sync_type: string;
  direction: "inbound" | "outbound" | "bidirectional";
  status: "queued" | "running" | "success" | "partial" | "failed";
  started_at: string;
  finished_at: string | null;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message: string | null;
  details_json: Record<string, unknown> | null;
}

export interface IntegrationWebhook {
  id: string;
  tenant_id: string;
  name: string;
  event_type: string;
  target_url: string;
  secret: string;
  is_active: boolean;
  last_called_at: string | null;
  last_status: string | null;
  created_at: string;
  updated_at: string;
}

export type CsvImportType =
  | "suppliers"
  | "users"
  | "departments"
  | "assets"
  | "risks"
  | "measures"
  | "evidence";
