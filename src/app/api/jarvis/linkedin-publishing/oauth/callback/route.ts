import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  isLinkedInOAuthConfigured,
} from "@/lib/jarvis/linkedin-publishing/linkedin-oauth";

export async function GET(request: Request) {
  if (!isLinkedInOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/jarvis/linkedin-publishing?error=oauth_not_configured", request.url)
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/jarvis/linkedin-publishing?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("linkedin_oauth_state")?.value;
  cookieStore.delete("linkedin_oauth_state");

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/jarvis/linkedin-publishing?error=invalid_state", request.url)
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const token = await exchangeLinkedInCode(code);
    const profile = await fetchLinkedInProfile(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const { error: dbError } = await supabase.from("linkedin_publishing_accounts").upsert(
      {
        user_id: user.id,
        linkedin_member_id: profile.sub,
        profile_name: profile.name,
        profile_picture_url: profile.picture ?? null,
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? null,
        token_expires_at: expiresAt,
        is_active: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (dbError) {
      return NextResponse.redirect(
        new URL(
          `/jarvis/linkedin-publishing?error=${encodeURIComponent(dbError.message)}`,
          request.url
        )
      );
    }

    return NextResponse.redirect(new URL("/jarvis/linkedin-publishing?connected=1", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(
      new URL(`/jarvis/linkedin-publishing?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
