import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { assertCanMarkContacted, processOutreachLead } from "@/lib/jarvis/outreach/processor";
import { mapOutreachLead } from "@/lib/jarvis/outreach/outreach-lead-map";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import type { B2BOutreachLead, B2BOutreachStatus } from "@/lib/types";

const VALID_STATUS: B2BOutreachStatus[] = [
  "new",
  "ready",
  "contacted",
  "replied",
  "customer",
  "skipped",
];

function mapLead(row: Record<string, unknown>): B2BOutreachLead {
  return mapOutreachLead(row);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("b2b_outreach_leads")
    .select("status")
    .eq("id", id)
    .single();

  if (loadError || !existing) {
    return NextResponse.json(
      { error: loadError?.message ?? "Lead nicht gefunden" },
      { status: 404 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (body.status && VALID_STATUS.includes(body.status)) {
    if (body.status === "contacted") {
      const check = await assertCanMarkContacted(supabase, existing.status);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 429 });
      }
    }

    updates.status = body.status;
    if (body.status === "contacted" && existing.status !== "contacted") {
      updates.contacted_at = new Date().toISOString();
    }
  }

  if (typeof body.outreach_message === "string") {
    updates.outreach_message = body.outreach_message;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("b2b_outreach_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ lead: mapLead(data) });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const supabase = await createClient();
  const { lead, error } = await processOutreachLead(supabase, id);

  if (error || !lead) {
    return NextResponse.json({ error: error ?? "Verarbeitung fehlgeschlagen" }, { status: 400 });
  }

  return NextResponse.json({ lead });
}
