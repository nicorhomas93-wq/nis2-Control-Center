import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantForUser } from "@/lib/integrations/tenant";

const ALLOWED = new Set(["suppliers", "assets", "tasks", "risks", "incidents", "evidence", "users"]);

type Params = { params: Promise<{ resource: string }> };

async function ensureAccess(request: Request, params: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 }) };

  const { resource } = await params.params;
  if (!ALLOWED.has(resource)) {
    return { error: NextResponse.json({ error: "Ressource nicht unterstützt" }, { status: 404 }) };
  }

  const { searchParams } = new URL(request.url);
  const tenant = await resolveTenantForUser(user.id, searchParams.get("tenantId"));
  if (!tenant) return { error: NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 }) };

  return { user, tenant, resource };
}

export async function GET(request: Request, params: Params) {
  const ctx = await ensureAccess(request, params);
  if ("error" in ctx) return ctx.error;

  return NextResponse.json({
    resource: ctx.resource,
    tenantId: ctx.tenant.id,
    status: "prepared",
    message: `Endpoint /api/integrations/${ctx.resource} ist vorbereitet. Live-Sync folgt in der nächsten Ausbauphase.`,
  });
}

export async function POST(request: Request, params: Params) {
  const ctx = await ensureAccess(request, params);
  if ("error" in ctx) return ctx.error;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    resource: ctx.resource,
    tenantId: ctx.tenant.id,
    accepted: true,
    mode: "prepared",
    payloadPreview: body,
    message: `POST /api/integrations/${ctx.resource} akzeptiert Payload im Vorbereitungsmodus.`,
  });
}
