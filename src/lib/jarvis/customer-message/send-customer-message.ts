import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMailtoUrl, buildWhatsAppUrl } from "@/lib/jarvis/customer-message/channels";
import type {
  CustomerEntityType,
  CustomerMessageChannel,
  CustomerMessageDelivery,
} from "@/lib/jarvis/customer-message/types";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import type { OutboundEmailMethod } from "@/lib/email/outbound";
import { JARVIS_EMAIL_NOT_CONFIGURED } from "@/lib/jarvis/email-config";
import { sendLeadEmail } from "@/lib/jarvis/send-lead-email";
import { JARVIS_DISCLAIMER } from "@/lib/jarvis/constants";

export interface SendCustomerMessageInput {
  entityType: CustomerEntityType;
  entityId: string;
  channel: CustomerMessageChannel;
  delivery: CustomerMessageDelivery;
  subject?: string | null;
  body: string;
  recipientEmail?: string | null;
  sentByUserId?: string | null;
  sentByEmail?: string | null;
  source?: "manual" | "automatic";
  triggerType?: string | null;
}

export interface SendCustomerMessageResult {
  messageId: string;
  status: "logged" | "sent" | "failed";
  delivery: CustomerMessageDelivery;
  externalUrl?: string;
  method?: OutboundEmailMethod;
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

function resolveDelivery(
  channel: CustomerMessageChannel,
  delivery: CustomerMessageDelivery
): CustomerMessageDelivery {
  if (delivery) return delivery;
  if (channel === "internal") return "internal";
  if (channel === "whatsapp") return "whatsapp";
  return "smtp";
}

export async function sendCustomerMessage(
  supabase: SupabaseClient,
  input: SendCustomerMessageInput
): Promise<SendCustomerMessageResult> {
  const body = input.body.trim();
  if (!body) {
    throw new Error("Nachricht darf nicht leer sein");
  }

  const delivery = resolveDelivery(input.channel, input.delivery);
  const recipient = await resolveRecipient(supabase, input.entityType, input.entityId);
  if (!recipient) {
    throw new Error("Kunde nicht gefunden");
  }

  const email =
    input.recipientEmail?.trim() ||
    recipient.email?.trim() ||
    null;

  if (input.entityType === "b2b_outreach_lead" && input.recipientEmail?.trim()) {
    await supabase
      .from("b2b_outreach_leads")
      .update({ contact_email: input.recipientEmail.trim() })
      .eq("id", input.entityId);
  }

  if (recipient.consentBlocked && delivery !== "internal") {
    throw new Error("Kontakt untersagt (no_contact)");
  }

  let status: "logged" | "sent" | "failed" = "logged";
  let externalUrl: string | undefined;
  let error: string | undefined;
  let method: OutboundEmailMethod | undefined;

  if (delivery === "internal") {
    status = "logged";
  } else if (delivery === "mailto") {
    if (!email) {
      throw new Error("Keine E-Mail-Adresse — bitte Empfänger eintragen");
    }
    const subject = input.subject?.trim() || `TKND NIS2 — ${recipient.companyName}`;
    const mailBody = `${body}\n\n---\n${JARVIS_DISCLAIMER}`;
    externalUrl = buildMailtoUrl(email, subject, mailBody);
    status = "logged";
  } else if (delivery === "whatsapp") {
    if (!recipient.phone) {
      throw new Error("Keine Telefonnummer hinterlegt");
    }
    externalUrl = buildWhatsAppUrl(recipient.phone, body) ?? undefined;
    if (!externalUrl) {
      throw new Error("Telefonnummer ungültig für WhatsApp");
    }
    status = "logged";
  } else if (delivery === "smtp") {
    if (!email) {
      throw new Error("Keine E-Mail-Adresse — bitte Empfänger eintragen");
    }
    const subject = input.subject?.trim() || `TKND NIS2 — ${recipient.companyName}`;
    const mailBody = `${body}\n\n---\n${JARVIS_DISCLAIMER}`;
    const mail = await sendLeadEmail({
      to: email,
      subject,
      body: mailBody,
      replyTo: process.env.PILOT_NOTIFICATION_EMAIL,
    });

    if (mail.sent) {
      status = "sent";
      method = mail.method;
    } else {
      status = "failed";
      error = mail.error ?? JARVIS_EMAIL_NOT_CONFIGURED;
    }
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
      source: input.source ?? "manual",
      trigger_type: input.triggerType ?? null,
      recipient_email:
        delivery === "smtp" || delivery === "mailto" ? email : null,
      recipient_phone: delivery === "whatsapp" ? recipient.phone : null,
      sent_by: input.sentByUserId ?? null,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    throw new Error(insertError?.message ?? "Speichern fehlgeschlagen");
  }

  if (
    input.entityType === "jarvis_lead" &&
    delivery === "smtp" &&
    status === "sent"
  ) {
    await supabase.from("lead_interactions").insert({
      lead_id: input.entityId,
      type: "email",
      direction: "outbound",
      subject: input.subject?.trim() || `TKND NIS2 — ${recipient.companyName}`,
      content: body,
      status: "sent",
    });
  }

  const eventType =
    status === "sent"
      ? "customer_message_sent"
      : status === "failed"
        ? "email_failed"
        : "customer_message_logged";

  await logJarvisEvent(supabase, {
    event_type: eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    summary:
      status === "sent"
        ? `E-Mail versendet an ${recipient.companyName}`
        : status === "failed"
          ? `E-Mail-Versand fehlgeschlagen: ${recipient.companyName}`
          : delivery === "mailto"
            ? `Nachricht gespeichert — Mailprogramm für ${recipient.companyName}`
            : delivery === "whatsapp"
              ? `Nachricht gespeichert — WhatsApp für ${recipient.companyName}`
              : `Nachricht intern gespeichert für ${recipient.companyName}`,
    details: {
      message_id: row.id,
      channel: input.channel,
      delivery,
      status,
      method,
      trigger_type: input.triggerType,
      sent_by: input.sentByEmail,
      error,
    },
  });

  return {
    messageId: row.id,
    status,
    delivery,
    externalUrl,
    method,
    error,
  };
}