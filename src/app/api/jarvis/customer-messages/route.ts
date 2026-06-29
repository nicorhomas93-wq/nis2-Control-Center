import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import type {
  CustomerEntityType,
  CustomerMessageChannel,
} from "@/lib/jarvis/customer-message/types";
import { sendCustomerMessage } from "@/lib/jarvis/customer-message/send-customer-message";

const ENTITY_TYPES: CustomerEntityType[] = ["jarvis_lead", "b2b_outreach_lead"];
const CHANNELS: CustomerMessageChannel[] = ["email", "whatsapp", "internal"];

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();
  const entityType = body.entityType as CustomerEntityType;
  const entityId = String(body.entityId ?? "").trim();
  const channel = body.channel as CustomerMessageChannel;
  const messageBody = String(body.body ?? "").trim();

  if (!ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Ungültiger entityType" }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ error: "entityId fehlt" }, { status: 400 });
  }
  if (!CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Ungültiger Kanal" }, { status: 400 });
  }
  if (!messageBody) {
    return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  }

  try {
    const result = await sendCustomerMessage(supabase, {
      entityType,
      entityId,
      channel,
      subject: body.subject ?? null,
      body: messageBody,
      sentByUserId: user.id,
      sentByEmail: user.email,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Versand fehlgeschlagen";
    if (message.includes("nicht gefunden") || message.includes("fehlt")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("no_contact")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
