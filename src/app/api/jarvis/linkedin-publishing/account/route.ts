import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { isLinkedInOAuthConfigured } from "@/lib/jarvis/linkedin-publishing/linkedin-oauth";

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_publishing_accounts")
    .select(
      "id, user_id, linkedin_member_id, profile_name, profile_picture_url, profile_headline, connection_mode, is_active, connected_at, token_expires_at, created_at, updated_at"
    )
    .eq("user_id", access.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    account: data,
    connected: Boolean(data?.is_active && data?.profile_name),
    oauthConfigured: isLinkedInOAuthConfigured(),
  });
}

export async function DELETE() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const { error } = await supabase
    .from("linkedin_publishing_accounts")
    .delete()
    .eq("user_id", access.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
