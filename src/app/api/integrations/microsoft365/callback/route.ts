import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/integrations/crypto";
import {
  MICROSOFT_OAUTH_STATE_COOKIE,
  exchangeMicrosoftCode,
  fetchMicrosoftOrganization,
  isMicrosoftOAuthConfigured,
} from "@/lib/integrations/microsoft-graph";

function redirectWithStatus(request: Request, status: "connected" | "error", detail?: string) {
  const url = new URL("/integrationen", request.url);
  url.searchParams.set(status === "connected" ? "m365" : "m365_error", detail ?? status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  if (!isMicrosoftOAuthConfigured()) {
    return redirectWithStatus(request, "error", "oauth_not_configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (oauthError) return redirectWithStatus(request, "error", oauthError);

  const cookieStore = await cookies();
  const raw = cookieStore.get(MICROSOFT_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(MICROSOFT_OAUTH_STATE_COOKIE);

  if (!code || !state || !raw) return redirectWithStatus(request, "error", "invalid_state");

  let saved: { nonce: string; connectionId: string };
  try {
    saved = JSON.parse(raw);
  } catch {
    return redirectWithStatus(request, "error", "invalid_state");
  }
  if (state !== saved.nonce) return redirectWithStatus(request, "error", "invalid_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const token = await exchangeMicrosoftCode(code);
    const org = await fetchMicrosoftOrganization(token.access_token).catch(() => null);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const admin = createAdminClient();
    if (!admin) return redirectWithStatus(request, "error", "server_not_configured");

    const { data: existing } = await admin
      .from("integration_connections")
      .select("config_json")
      .eq("id", saved.connectionId)
      .maybeSingle();

    const { error: dbError } = await admin
      .from("integration_connections")
      .update({
        status: "active",
        encrypted_access_token: encryptSecret(token.access_token),
        encrypted_refresh_token: encryptSecret(token.refresh_token ?? null),
        last_error: null,
        config_json: {
          ...((existing?.config_json as Record<string, unknown>) ?? {}),
          tokenExpiresAt: expiresAt,
          microsoftTenantId: org?.id ?? null,
          microsoftTenantName: org?.displayName ?? null,
        },
      })
      .eq("id", saved.connectionId);

    if (dbError) return redirectWithStatus(request, "error", dbError.message);

    return redirectWithStatus(request, "connected");
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return redirectWithStatus(request, "error", message);
  }
}
