import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { resolveTenantForUser } from "@/lib/integrations/tenant";
import { encodeSecretPlaceholder, maskSecret } from "@/lib/integrations/secret-store";

function maskedConnection(row: Record<string, unknown>) {
  return {
    ...row,
    encrypted_client_secret: maskSecret(String(row.encrypted_client_secret ?? "")),
    encrypted_access_token: maskSecret(String(row.encrypted_access_token ?? "")),
    encrypted_refresh_token: maskSecret(String(row.encrypted_refresh_token ?? "")),
    api_key_encrypted: maskSecret(String(row.api_key_encrypted ?? "")),
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const tenant = await resolveTenantForUser(user.id, tenantId);
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });

  const { data, error } = await supabase
    .from("integration_connections")
    .select("*, integration_providers(id,name,key,status,category,icon)")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({
    connections: (data ?? []).map((row) => maskedConnection(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const tenant = await resolveTenantForUser(user.id, body.tenantId);
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });
  if (!body.providerId || !body.name) {
    return NextResponse.json({ error: "providerId und name sind erforderlich" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("integration_connections")
    .insert({
      tenant_id: tenant.id,
      provider_id: body.providerId,
      name: String(body.name).trim(),
      status: body.status ?? "prepared",
      auth_type: body.authType ?? "api_key",
      base_url: body.baseUrl?.trim() || null,
      client_id: body.clientId?.trim() || null,
      encrypted_client_secret: encodeSecretPlaceholder(body.clientSecret),
      encrypted_access_token: encodeSecretPlaceholder(body.accessToken),
      encrypted_refresh_token: encodeSecretPlaceholder(body.refreshToken),
      api_key_encrypted: encodeSecretPlaceholder(body.apiKey),
      config_json: body.config ?? {},
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }
  return NextResponse.json({ connection: maskedConnection(data as Record<string, unknown>) });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

  const { data: existing, error: readError } = await supabase
    .from("integration_connections")
    .select("*")
    .eq("id", body.id)
    .single();
  if (readError || !existing) {
    return NextResponse.json({ error: "Verbindung nicht gefunden" }, { status: 404 });
  }

  const tenant = await resolveTenantForUser(user.id, existing.tenant_id);
  if (!tenant) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const updates: Record<string, unknown> = {
    name: body.name ?? existing.name,
    status: body.status ?? existing.status,
    auth_type: body.authType ?? existing.auth_type,
    base_url: body.baseUrl ?? existing.base_url,
    client_id: body.clientId ?? existing.client_id,
    config_json: body.config ?? existing.config_json ?? {},
    last_error: body.lastError ?? existing.last_error ?? null,
  };

  if (body.clientSecret) updates.encrypted_client_secret = encodeSecretPlaceholder(body.clientSecret);
  if (body.accessToken) updates.encrypted_access_token = encodeSecretPlaceholder(body.accessToken);
  if (body.refreshToken) updates.encrypted_refresh_token = encodeSecretPlaceholder(body.refreshToken);
  if (body.apiKey) updates.api_key_encrypted = encodeSecretPlaceholder(body.apiKey);

  const { data, error } = await supabase
    .from("integration_connections")
    .update(updates)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ connection: maskedConnection(data as Record<string, unknown>) });
}
