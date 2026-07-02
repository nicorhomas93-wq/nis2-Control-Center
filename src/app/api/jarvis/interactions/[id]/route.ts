import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendLeadEmail } from "@/lib/jarvis/send-lead-email";
import { getJarvisEmailConfig, JARVIS_EMAIL_NOT_CONFIGURED } from "@/lib/jarvis/email-config";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { JARVIS_DISCLAIMER } from "@/lib/jarvis/constants";

export async function POST(
  _request: Request,
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

  const { data: interaction } = await supabase
    .from("lead_interactions")
    .select("*, lead:leads(*)")
    .eq("id", id)
    .single();

  if (!interaction) {
    return NextResponse.json({ error: "Interaktion nicht gefunden" }, { status: 404 });
  }

  if (interaction.status !== "draft") {
    return NextResponse.json(
      { error: "Nur Entwürfe können manuell freigegeben und versendet werden" },
      { status: 400 }
    );
  }

  const interactionRow = interaction as Record<string, unknown>;
  const lead = (interactionRow.lead ?? interactionRow.leads) as {
    email?: string | null;
    consent_status?: string;
    company_name?: string | null;
    contact_name?: string | null;
  } | null;

  if (!lead?.email) {
    return NextResponse.json({ error: "Lead hat keine E-Mail-Adresse" }, { status: 400 });
  }

  if (lead.consent_status === "no_contact") {
    return NextResponse.json(
      { error: "Kontakt untersagt (no_contact) — Versand blockiert" },
      { status: 403 }
    );
  }

  const emailConfig = getJarvisEmailConfig();
  if (!emailConfig.configured) {
    return NextResponse.json({ error: JARVIS_EMAIL_NOT_CONFIGURED }, { status: 503 });
  }

  const bodyWithDisclaimer = `${interaction.content ?? ""}\n\n---\n${JARVIS_DISCLAIMER}`;

  const mail = await sendLeadEmail({
    to: lead.email,
    subject: interaction.subject ?? "TKND NIS2 Control Center",
    body: bodyWithDisclaimer,
    replyTo: process.env.PILOT_NOTIFICATION_EMAIL,
  });

  if (!mail.sent) {
    await supabase
      .from("lead_interactions")
      .update({ status: "failed" })
      .eq("id", id);

    await logJarvisEvent(supabase, {
      event_type: "email_failed",
      entity_type: "lead_interaction",
      entity_id: id,
      summary: `E-Mail-Versand fehlgeschlagen: ${lead.company_name ?? lead.email}`,
      details: { error: mail.error },
    });

    return NextResponse.json({ error: mail.error ?? "Versand fehlgeschlagen" }, { status: 500 });
  }

  await supabase
    .from("lead_interactions")
    .update({ status: "sent" })
    .eq("id", id);

  if (interaction.lead_id) {
    await supabase
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", interaction.lead_id)
      .eq("status", "new");
  }

  await logJarvisEvent(supabase, {
    event_type: "email_sent",
    entity_type: "lead_interaction",
    entity_id: id,
    summary: `E-Mail versendet an ${lead.email}`,
    details: {
      subject: interaction.subject,
      approved_by: user.email,
      lead_id: interaction.lead_id,
      method: mail.method,
      provider: emailConfig.label,
    },
  });

  return NextResponse.json({ sent: true, method: mail.method });
}

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

  const { subject, content, status } = await request.json();
  const updates: Record<string, string> = {};
  if (subject !== undefined) updates.subject = subject;
  if (content !== undefined) updates.content = content;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from("lead_interactions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ interaction: data });
}
