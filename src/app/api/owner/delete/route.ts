import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerApiAccess } from "@/lib/owner/require-api-access";
import { softDeleteEntity } from "@/lib/owner/soft-delete";
import type { OwnerEntityType } from "@/lib/owner/types";
import { OWNER_DELETE_DENIED } from "@/lib/owner/types";

export async function POST(request: Request) {
  const access = await requireOwnerApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const { entityType, entityId, reason } = body as {
    entityType?: OwnerEntityType;
    entityId?: string;
    reason?: string;
  };

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType und entityId erforderlich" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await softDeleteEntity(
    supabase,
    access.userId,
    entityType,
    entityId,
    reason
  );

  if (error) {
    const status = error === OWNER_DELETE_DENIED ? 403 : 500;
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ success: true });
}
