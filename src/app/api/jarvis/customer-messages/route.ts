import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { evaluateCustomerProfile } from "@/lib/jarvis/customer-message/evaluate-customer-profile";
import type {
  CustomerEntityType,
  CustomerMessageChannel,
  CustomerMessageDelivery,
} from "@/lib/jarvis/customer-message/types";
import { sendCustomerMessage } from "@/lib/jarvis/customer-message/send-customer-message";

const ENTITY_TYPES: CustomerEntityType[] = ["jarvis_lead", "b2b_outreach_lead"];
const CHANNELS: CustomerMessageChannel[] = ["email", "whatsapp", "internal"];
const DELIVERIES: CustomerMessageDelivery[] = ["smtp", "mailto", "whatsapp", "internal"];

export async function GET(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") as CustomerEntityType | null;
  const entityId = searchParams.get("entityId")?.trim();

  if (!entityType || !ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "entityType fehlt oder ungültig" }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ error: "entityId fehlt" }, { status: 400 });
  }

  const supabase = await createClient();

  const [{ data: messages }, { data: settings }, profile] = await Promise.all([
    supabase
      .from("customer_messages")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("customer_message_automation")
      .select("auto_enabled")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle(),
    evaluateCustomerProfile(supabase, entityType, entityId),
  ]);

  return NextResponse.json({
    messages: messages ?? [],
    autoEnabled: Boolean(settings?.auto_enabled),
    profile,
  });
}

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
  const delivery = (body.delivery ?? inferDelivery(channel)) as CustomerMessageDelivery;
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
  if (!DELIVERIES.includes(delivery)) {
    return NextResponse.json({ error: "Ungültige Zustellart" }, { status: 400 });
  }
  if (!messageBody) {
    return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  }

  try {
    const result = await sendCustomerMessage(supabase, {
      entityType,
      entityId,
      channel,
      delivery,
      subject: body.subject ?? null,
      body: messageBody,
      recipientEmail: body.recipientEmail ?? null,
      sentByUserId: user.id,
      sentByEmail: user.email,
      source: "manual",
    });

    if (result.status === "failed") {
      const statusCode =
        result.error === "E-Mail-Versand nicht eingerichtet" ? 503 : 500;
      return NextResponse.json(
        { error: result.error ?? "Versand fehlgeschlagen", ...result },
        { status: statusCode }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Versand fehlgeschlagen";
    if (message.includes("nicht gefunden") || message.includes("fehlt")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("no_contact")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (
      message === "E-Mail-Versand nicht eingerichtet" ||
      message.includes("nicht konfiguriert")
    ) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function inferDelivery(channel: CustomerMessageChannel): CustomerMessageDelivery {
  if (channel === "internal") return "internal";
  if (channel === "whatsapp") return "whatsapp";
  return "smtp";
}
