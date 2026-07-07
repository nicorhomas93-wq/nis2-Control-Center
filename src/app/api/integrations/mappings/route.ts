import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { resolveTenantForUser } from "@/lib/integrations/tenant";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tenant = await resolveTenantForUser(user.id, searchParams.get("tenantId"));
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });

  const connectionId = searchParams.get("connectionId");
  let query = supabase.from("integration_mappings").select("*").eq("tenant_id", tenant.id);
  if (connectionId) query = query.eq("connection_id", connectionId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ mappings: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await request.json();

  if (!body.connectionId || !body.sourceObject || !body.targetObject || !body.sourceField || !body.targetField) {
    return NextResponse.json({ error: "Pflichtfelder für Mapping fehlen" }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("integration_connections")
    .select("tenant_id")
    .eq("id", body.connectionId)
    .single();
  if (!connection) return NextResponse.json({ error: "Verbindung nicht gefunden" }, { status: 404 });

  const tenant = await resolveTenantForUser(user.id, connection.tenant_id);
  if (!tenant) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const { data, error } = await supabase
    .from("integration_mappings")
    .insert({
      tenant_id: tenant.id,
      connection_id: body.connectionId,
      source_object: body.sourceObject,
      target_object: body.targetObject,
      source_field: body.sourceField,
      target_field: body.targetField,
      transformation_rule: body.transformationRule ?? null,
      is_required: Boolean(body.isRequired),
      is_active: body.isActive ?? true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ mapping: data });
}
