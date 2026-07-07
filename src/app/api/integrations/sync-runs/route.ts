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

  const { data, error } = await supabase
    .from("integration_sync_runs")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ runs: data ?? [] });
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

  const { data: run, error } = await supabase
    .from("integration_sync_runs")
    .insert({
      tenant_id: tenant.id,
      connection_id: body.connectionId ?? null,
      sync_type: body.syncType ?? "manual",
      direction: body.direction ?? "bidirectional",
      status: body.status ?? "running",
      started_at: new Date().toISOString(),
      details_json: body.details ?? { mode: "demo", note: "Vorbereitete Integration ohne Live-API" },
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

  const completedStatus = body.status ?? "success";
  const { data: finished } = await supabase
    .from("integration_sync_runs")
    .update({
      status: completedStatus,
      finished_at: new Date().toISOString(),
      records_processed: body.recordsProcessed ?? 0,
      records_created: body.recordsCreated ?? 0,
      records_updated: body.recordsUpdated ?? 0,
      records_failed: body.recordsFailed ?? 0,
      error_message: body.errorMessage ?? null,
    })
    .eq("id", run.id)
    .select("*")
    .single();

  return NextResponse.json({ run: finished ?? run });
}
