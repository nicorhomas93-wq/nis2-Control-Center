import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerApiAccess } from "@/lib/owner/require-api-access";
import { restoreEntity } from "@/lib/owner/soft-delete";
import type { OwnerEntityType } from "@/lib/owner/types";

export async function POST(request: Request) {
  const access = await requireOwnerApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const { entityType, entityId, restoreRelated } = body as {
    entityType?: OwnerEntityType;
    entityId?: string;
    restoreRelated?: boolean;
  };

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType und entityId erforderlich" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await restoreEntity(
    supabase,
    access.userId,
    entityType,
    entityId,
    Boolean(restoreRelated)
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
