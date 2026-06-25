import { NextResponse } from "next/server";
import { handleEmailLinkClick } from "@/lib/acquisition/follow-up/engine";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  const to = url.searchParams.get("to");

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { redirectUrl } = await handleEmailLinkClick(token);
  const target = to ? decodeURIComponent(to) : redirectUrl;

  return NextResponse.redirect(target);
}
