import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerApiAccess } from "@/lib/owner/require-api-access";
import { cleanupTestData } from "@/lib/owner/soft-delete";
import { activeOnly } from "@/lib/supabase/soft-delete";

export async function POST() {
  const access = await requireOwnerApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const { deleted, error } = await cleanupTestData(supabase, access.userId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted });
}

export async function GET() {
  const access = await requireOwnerApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const { data, error } = await activeOnly(
    supabase
      .from("companies")
      .select("id, company_name, is_demo, is_mandant")
      .eq("user_id", access.userId)
      .eq("is_demo", true)
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ testCompanies: data ?? [] });
}
