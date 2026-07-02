import { NextResponse } from "next/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { classifyResponseText } from "@/lib/jarvis/kampagnen/response-classifier";
import { processIncomingResponse } from "@/lib/jarvis/kampagnen/response-automation";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const response_text = typeof body.response_text === "string" ? body.response_text.trim() : "";

  if (!response_text) {
    return NextResponse.json({ error: "Antworttext fehlt" }, { status: 400 });
  }

  const classified = classifyResponseText(response_text);
  const preview = processIncomingResponse({
    response_text,
    manual_type: body.response_type,
    contact_name: body.contact_name,
    company_name: body.company_name ?? "Lead",
    channel: body.channel,
  });

  return NextResponse.json({
    classification: classified,
    preview,
  });
}
