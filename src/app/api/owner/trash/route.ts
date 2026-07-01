import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerApiAccess } from "@/lib/owner/require-api-access";
import { listTrashItems } from "@/lib/owner/soft-delete";

export async function GET() {
  const access = await requireOwnerApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const items = await listTrashItems(supabase, access.userId);

  return NextResponse.json({ items });
}
