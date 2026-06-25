import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateLeadScore } from "@/lib/jarvis/lead-scoring";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import type { LeadStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status) updates.status = body.status as LeadStatus;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.consent_status) updates.consent_status = body.consent_status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  }

  if (updates.consent_status || updates.notes !== undefined) {
    const scoring = calculateLeadScore({
      ...existing,
      ...updates,
    });
    updates.lead_score = scoring.score;
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  await logJarvisEvent(supabase, {
    event_type: "lead_updated",
    entity_type: "lead",
    entity_id: id,
    summary: `Lead aktualisiert: ${lead.company_name ?? lead.email}`,
    details: updates,
  });

  return NextResponse.json({ lead });
}
