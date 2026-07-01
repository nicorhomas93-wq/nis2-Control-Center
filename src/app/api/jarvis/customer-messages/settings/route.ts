import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { runAutomationForCustomer } from "@/lib/jarvis/customer-message/run-automation";
import type { CustomerEntityType } from "@/lib/jarvis/customer-message/types";

const ENTITY_TYPES: CustomerEntityType[] = ["jarvis_lead", "b2b_outreach_lead"];

export async function PATCH(request: Request) {
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
  const autoEnabled = Boolean(body.autoEnabled);

  if (!ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Ungültiger entityType" }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ error: "entityId fehlt" }, { status: 400 });
  }

  const { error } = await supabase.from("customer_message_automation").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      auto_enabled: autoEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entity_type,entity_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let automationResult = null;
  if (autoEnabled) {
    automationResult = await runAutomationForCustomer(supabase, {
      entityType,
      entityId,
      sentByUserId: user.id,
      sentByEmail: user.email,
      force: true,
    });
  }

  return NextResponse.json({ autoEnabled, automationResult });
}
