import { NextResponse } from "next/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getJarvisEmailConfig } from "@/lib/jarvis/email-config";

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const config = getJarvisEmailConfig();
  return NextResponse.json(config);
}
