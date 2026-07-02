import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { processIncomingResponse } from "@/lib/jarvis/kampagnen/response-automation";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const response_text = typeof body.response_text === "string" ? body.response_text.trim() : "";
  const company_name = typeof body.company_name === "string" ? body.company_name.trim() : "";

  if (!company_name) {
    return NextResponse.json({ error: "Firma fehlt" }, { status: 400 });
  }
  if (!response_text) {
    return NextResponse.json({ error: "Antworttext fehlt" }, { status: 400 });
  }

  const supabase = await createClient();
  const now = new Date();
  const contact_name = body.contact_name?.trim() || null;

  let leadRow: { contact_name?: string | null; company_name?: string } | null = null;
  if (body.lead_id) {
    const { data } = await supabase
      .from("linkedin_campaign_leads")
      .select("contact_name, company_name")
      .eq("id", body.lead_id)
      .maybeSingle();
    leadRow = data;
  }

  const automation = processIncomingResponse({
    response_text,
    manual_type: body.response_type,
    contact_name: contact_name ?? leadRow?.contact_name,
    company_name,
    channel: body.channel,
  });

  const responseDate = body.response_date || now.toISOString().slice(0, 10);
  const responseTime = body.response_time || now.toTimeString().slice(0, 8);

  const { data: responseRow, error } = await supabase
    .from("linkedin_campaign_responses")
    .insert({
      campaign_id: body.campaign_id || null,
      lead_id: body.lead_id || null,
      company_name,
      contact_name,
      channel: body.channel ?? "linkedin",
      response_date: responseDate,
      response_time: responseTime,
      response_text,
      response_type: automation.response_type,
      rating: body.rating != null ? Number(body.rating) : null,
      notes: body.notes?.trim() || null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      recorded_by: body.recorded_by?.trim() || "Nico",
      auto_classified: !body.response_type || body.response_type === "auto",
      suggested_reply: automation.suggested_reply,
      task_title: automation.task?.title ?? null,
      task_due_at: automation.task?.due_at ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  if (body.lead_id) {
    await supabase
      .from("linkedin_campaign_leads")
      .update({
        status: automation.lead_status,
        next_step: automation.next_step,
        suggested_reply: automation.suggested_reply,
        suggested_message: automation.suggested_reply,
        follow_up_at: automation.follow_up_at,
        reminder_type: automation.reminder_type,
        offer_notes: automation.offer_notes,
        suggested_license: automation.suggested_license,
        last_response_at: now.toISOString(),
        management_review_at: automation.management_review_at,
      })
      .eq("id", body.lead_id);
  }

  if (automation.task && body.lead_id) {
    await supabase.from("linkedin_campaign_tasks").insert({
      campaign_id: body.campaign_id || null,
      lead_id: body.lead_id,
      response_id: responseRow.id,
      title: automation.task.title,
      description: automation.task.description,
      task_type: automation.task.task_type,
      due_at: automation.task.due_at,
      status: "open",
    });
  }

  if (automation.create_demo && body.lead_id) {
    await supabase.from("linkedin_campaign_demos").insert({
      campaign_id: body.campaign_id || null,
      lead_id: body.lead_id,
      company_name,
      contact_name: contact_name ?? leadRow?.contact_name ?? null,
      status: "planned",
      notes: automation.demo_notes,
    });
  }

  return NextResponse.json({
    response: responseRow,
    automation: {
      response_type: automation.response_type,
      lead_status: automation.lead_status,
      next_step: automation.next_step,
      suggested_reply: automation.suggested_reply,
      task: automation.task,
      create_demo: automation.create_demo,
    },
  });
}
