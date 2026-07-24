import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantForUser } from "@/lib/integrations/tenant";
import { getValidMicrosoftAccessToken } from "@/lib/integrations/microsoft365-connection";
import { fetchMicrosoftSites, fetchMicrosoftUsers } from "@/lib/integrations/microsoft-graph";

type SyncAction = "test_connection" | "import_users" | "import_departments" | "check_sharepoint";

async function logSyncRun(
  tenantId: string,
  connectionId: string,
  syncType: string,
  outcome: { status: "success" | "error"; recordsProcessed?: number; errorMessage?: string }
) {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: run } = await admin
    .from("integration_sync_runs")
    .insert({
      tenant_id: tenantId,
      connection_id: connectionId,
      sync_type: syncType,
      direction: "inbound",
      status: "running",
      started_at: new Date().toISOString(),
      details_json: { mode: "live" },
    })
    .select("*")
    .single();

  if (!run) return null;

  const { data: finished } = await admin
    .from("integration_sync_runs")
    .update({
      status: outcome.status,
      finished_at: new Date().toISOString(),
      records_processed: outcome.recordsProcessed ?? 0,
      records_created: outcome.status === "success" ? outcome.recordsProcessed ?? 0 : 0,
      error_message: outcome.errorMessage ?? null,
    })
    .eq("id", run.id)
    .select("*")
    .single();

  return finished ?? run;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { connectionId, action } = body as { connectionId?: string; action?: SyncAction };
  if (!connectionId || !action) {
    return NextResponse.json({ error: "connectionId und action erforderlich" }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("integration_connections")
    .select("id, tenant_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (!connection) return NextResponse.json({ error: "Verbindung nicht gefunden" }, { status: 404 });

  const tenant = await resolveTenantForUser(user.id, connection.tenant_id);
  if (!tenant) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const admin = createAdminClient();

  try {
    const accessToken = await getValidMicrosoftAccessToken(connectionId);

    let recordsProcessed = 0;
    if (action === "import_users" || action === "test_connection") {
      const users = await fetchMicrosoftUsers(accessToken);
      recordsProcessed = users.length;
    }
    if (action === "import_departments") {
      const users = await fetchMicrosoftUsers(accessToken);
      recordsProcessed = new Set(users.map((u) => u.department).filter(Boolean)).size;
    }
    if (action === "check_sharepoint") {
      const sites = await fetchMicrosoftSites(accessToken);
      recordsProcessed = sites.length;
    }

    if (admin) {
      await admin
        .from("integration_connections")
        .update({ status: "active", last_sync_at: new Date().toISOString(), last_error: null })
        .eq("id", connectionId);
    }

    const run = await logSyncRun(connection.tenant_id, connectionId, action, {
      status: "success",
      recordsProcessed,
    });

    return NextResponse.json({ run, recordsProcessed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Synchronisation fehlgeschlagen";

    if (admin) {
      await admin.from("integration_connections").update({ status: "error", last_error: message }).eq("id", connectionId);
    }

    const run = await logSyncRun(connection.tenant_id, connectionId, action, {
      status: "error",
      errorMessage: message,
    });

    return NextResponse.json({ error: message, run }, { status: 502 });
  }
}
