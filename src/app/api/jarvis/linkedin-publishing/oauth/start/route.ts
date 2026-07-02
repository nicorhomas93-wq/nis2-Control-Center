import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import {
  buildLinkedInAuthUrl,
  isLinkedInOAuthConfigured,
} from "@/lib/jarvis/linkedin-publishing/linkedin-oauth";

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  if (!isLinkedInOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "LinkedIn OAuth ist nicht konfiguriert. LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET und NEXT_PUBLIC_APP_URL setzen.",
      },
      { status: 503 }
    );
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = buildLinkedInAuthUrl(state);
  return NextResponse.redirect(url);
}
