import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMailtoUrl, buildWhatsAppUrl } from "@/lib/jarvis/customer-message/channels";
import type {
  CustomerEntityType,
  CustomerMessageChannel,
} from "@/lib/jarvis/customer-message/types";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import { sendLeadEmail } from "@/lib/jarvis/send-lead-email";
import { JARVIS_DISCLAIMER } from "@/lib/jarvis/constants";

export interface SendCustomerMessageInput {
  entityType: CustomerEntityType;
  entityId: string;
  channel: CustomerMessageChannel;
  subject?: string | null;
  body: string;
  sentByUserId: string;
  sentByEmail?: string | null;
}

export interface SendCustomerMessageResult {
  messageId: string;
  status: "logged" | "sent" | "failed";
  externalUrl?: string;
  error?: string;
}

interface ResolvedRecipient {
  companyName: string;
  email: string | null;
  phone: string | null;
  consentBlocked: boolean;
}

async function resolveRecipient(
  supabase: SupabaseClient,
  entityType: CustomerEntityType,
  entityId: string
): Promise<ResolvedRecipient | null> {
  if (entityType === "jarvis_lead") {
    const { data } = await supabase
      .from("leads")
      .select("company_name, email, phone, consent_status")
      .eq("id", entityId)
      .maybeSingle();
    if (!data) return null;
    return {
      companyName: data.company_name ?? "Unbekannt",
      email: data.email,
      phone: data.phone,
      consentBlocked: data.consent_status === "no_contact",
    };
  }

  const { data } = await supabase
    .from("b2b_outreach_leads")
    .select("company_name, contact_email")
    .eq("id", entityId)
    .maybeSingle();
  if (!data) return null;
  return {
    companyName: data.company_name,
    email: data.contact_email,
    phone: null,
    consentBlocked: false,
  };
}

export async function sendCustomerMessage(
  supabase: SupabaseClient,
  input: SendCustomerMessageInput
): Promise<SendCustomerMessageResult> {
  const body = input.body.trim();
  if (!body) {
    throw new Error("Nachricht darf nicht leer sein");
  }

  const recipient = await resolveRecipient(supabase, input.entityType, input.entityId);
  if (!recipient) {
    throw new Error("Kunde nicht gefunden");
  }

  if (recipient.consentBlocked && input.channel !== "internal") {
    throw new Error("Kontakt untersagt (no_contact)");
  }

  let status: "logged" | "sent" | "failed" = "logged";
  let externalUrl: string | undefined;
  let error: string | undefined;

  if (input.channel === "email") {
    if (!recipient.email) {
      throw new Error("Keine E-Mail-Adresse hinterlegt");
    }
    const subject = input.subject?.trim() || `TKND NIS2 — ${recipient.companyName}`;
    const mailBody = `${body}\n\n---\n${JARVIS_DISCLAIMER}`;
    const mail = await sendLeadEmail({
      to: recipient.email,
      subject,
      body: mailBody,
      replyTo: process.env.PILOT_NOTIFICATION_EMAIL,
    });

    if (mail.sent) {
      status = "sent";
    } else {
      status = "logged";
      externalUrl = buildMailtoUrl(recipient.email, subject, mailBody);
      error = mail.error;
    }
  } else if (input.channel === "whatsapp") {
    if (!recipient.phone) {
      throw new Error("Keine Telefonnummer hinterlegt");
    }
    externalUrl = buildWhatsAppUrl(recipient.phone, body) ?? undefined;
    if (!externalUrl) {
      throw new Error("Telefonnummer ungültig für WhatsApp");
    }
    status = "logged";
  }

  const { data: row, error: insertError } = await supabase
    .from("customer_messages")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      channel: input.channel,
      subject: input.subject?.trim() || null,
      body,
      status,
      recipient_email: input.channel === "email" ? recipient.email : null,
      recipient_phone: input.channel === "whatsapp" ? recipient.phone : null,
      sent_by: input.sentByUserId,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    throw new Error(insertError?.message ?? "Speichern fehlgeschlagen");
  }

  if (input.entityType === "jarvis_lead" && input.channel === "email" && status === "sent") {
    await supabase.from("lead_interactions").insert({
      lead_id: input.entityId,
      type: "email",
      direction: "outbound",
      subject: input.subject?.trim() || `TKND NIS2 — ${recipient.companyName}`,
      content: body,
      status: "sent",
    });
  }

  await logJarvisEvent(supabase, {
    event_type: input.channel === "internal" ? "customer_message_logged" : "customer_message_sent",
    entity_type: input.entityType,
    entity_id: input.entityId,
    summary: `Nachricht (${input.channel}) an ${recipient.companyName}`,
    details: {
      message_id: row.id,
      channel: input.channel,
      status,
      sent_by: input.sentByEmail,
    },
  });

  return {
    messageId: row.id,
    status,
    externalUrl,
    error,
  };
}
