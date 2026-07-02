import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const profileName = typeof body.profile_name === "string" ? body.profile_name.trim() : "";

  if (!profileName) {
    return NextResponse.json({ error: "Anzeigename ist erforderlich" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_publishing_accounts")
    .upsert(
      {
        user_id: access.userId,
        profile_name: profileName,
        profile_headline:
          typeof body.profile_headline === "string" ? body.profile_headline.trim() || null : null,
        profile_picture_url:
          typeof body.profile_picture_url === "string"
            ? body.profile_picture_url.trim() || null
            : null,
        connection_mode: "manual",
        is_active: true,
        linkedin_member_id: null,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select(
      "id, user_id, linkedin_member_id, profile_name, profile_picture_url, profile_headline, connection_mode, is_active, connected_at, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}
