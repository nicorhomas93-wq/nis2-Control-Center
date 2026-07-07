import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { resolveTenantForUser } from "@/lib/integrations/tenant";
import { encodeSecretPlaceholder, maskSecret } from "@/lib/integrations/secret-store";

function withMaskedSecret<T extends { secret?: string | null }>(hook: T): T & { secret_masked: string | null } {
  return {
    ...hook,
    secret_masked: maskSecret(hook.secret ?? null),
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tenant = await resolveTenantForUser(user.id, searchParams.get("tenantId"));
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });

  const { data, error } = await supabase
    .from("integration_webhooks")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ webhooks: (data ?? []).map((h) => withMaskedSecret(h)) });
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
  if (!body.name || !body.eventType || !body.targetUrl) {
    return NextResponse.json({ error: "name, eventType und targetUrl sind erforderlich" }, { status: 400 });
  }

  const rawSecret = body.secret || `tknd_${randomUUID().replace(/-/g, "")}`;
  const { data, error } = await supabase
    .from("integration_webhooks")
    .insert({
      tenant_id: tenant.id,
      name: body.name,
      event_type: body.eventType,
      target_url: body.targetUrl,
      secret: encodeSecretPlaceholder(rawSecret),
      is_active: body.isActive ?? true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ webhook: withMaskedSecret(data), generated_secret: rawSecret });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

  const { data: existing } = await supabase
    .from("integration_webhooks")
    .select("*")
    .eq("id", body.id)
    .single();
  if (!existing) return NextResponse.json({ error: "Webhook nicht gefunden" }, { status: 404 });

  const tenant = await resolveTenantForUser(user.id, existing.tenant_id);
  if (!tenant) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const updates: Record<string, unknown> = {
    name: body.name ?? existing.name,
    event_type: body.eventType ?? existing.event_type,
    target_url: body.targetUrl ?? existing.target_url,
    is_active: body.isActive ?? existing.is_active,
  };
  if (body.secret) updates.secret = encodeSecretPlaceholder(body.secret);

  const { data, error } = await supabase
    .from("integration_webhooks")
    .update(updates)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ webhook: withMaskedSecret(data) });
}
