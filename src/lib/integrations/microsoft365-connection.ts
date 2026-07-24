import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import { refreshMicrosoftToken } from "@/lib/integrations/microsoft-graph";

interface ConnectionRow {
  id: string;
  tenant_id: string;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  config_json: Record<string, unknown> | null;
}

/**
 * Returns a valid Microsoft Graph access token for a connection, refreshing
 * it first if it has expired. Throws with a message safe to surface in a
 * sync-run's error_message if there's no real connection yet.
 */
export async function getValidMicrosoftAccessToken(connectionId: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase Admin Client nicht verfügbar.");

  const { data, error } = await admin
    .from("integration_connections")
    .select("id, tenant_id, encrypted_access_token, encrypted_refresh_token, config_json")
    .eq("id", connectionId)
    .maybeSingle();

  const connection = data as ConnectionRow | null;
  if (error || !connection) throw new Error("Verbindung nicht gefunden.");
  if (!connection.encrypted_access_token) {
    throw new Error("Noch nicht mit Microsoft verbunden — bitte zuerst die Microsoft-Anmeldung starten.");
  }

  const expiresAt = connection.config_json?.tokenExpiresAt as string | undefined;
  const stillValid = expiresAt && new Date(expiresAt).getTime() - Date.now() > 60_000;
  if (stillValid) {
    const token = decryptSecret(connection.encrypted_access_token);
    if (token) return token;
  }

  const refreshToken = decryptSecret(connection.encrypted_refresh_token);
  if (!refreshToken) {
    throw new Error("Verbindung ist abgelaufen — bitte die Microsoft-Anmeldung erneut starten.");
  }

  const refreshed = await refreshMicrosoftToken(refreshToken);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await admin
    .from("integration_connections")
    .update({
      encrypted_access_token: encryptSecret(refreshed.access_token),
      encrypted_refresh_token: encryptSecret(refreshed.refresh_token ?? refreshToken),
      config_json: { ...(connection.config_json ?? {}), tokenExpiresAt: newExpiresAt },
    })
    .eq("id", connectionId);

  return refreshed.access_token;
}
