import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantForUser } from "@/lib/integrations/tenant";
import {
  MICROSOFT_OAUTH_STATE_COOKIE,
  buildMicrosoftAuthUrl,
  isMicrosoftOAuthConfigured,
} from "@/lib/integrations/microsoft-graph";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  if (!isMicrosoftOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Microsoft-365-OAuth ist nicht konfiguriert. MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET und NEXT_PUBLIC_APP_URL setzen.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId erforderlich" }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("integration_connections")
    .select("id, tenant_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (!connection) {
    return NextResponse.json({ error: "Verbindung nicht gefunden" }, { status: 404 });
  }

  const tenant = await resolveTenantForUser(user.id, connection.tenant_id);
  if (!tenant) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const nonce = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(MICROSOFT_OAUTH_STATE_COOKIE, JSON.stringify({ nonce, connectionId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildMicrosoftAuthUrl(nonce));
}
