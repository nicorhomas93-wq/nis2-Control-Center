import {
  sendOutboundEmail,
  type OutboundEmailMethod,
} from "@/lib/email/outbound";
import { JARVIS_EMAIL_NOT_CONFIGURED } from "@/lib/jarvis/email-config";

export type SendLeadEmailResult = {
  sent: boolean;
  method?: OutboundEmailMethod;
  error?: string;
};

export async function sendLeadEmail(options: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<SendLeadEmailResult> {
  const result = await sendOutboundEmail(options);
  if (!result.sent && !result.error) {
    return { sent: false, error: JARVIS_EMAIL_NOT_CONFIGURED };
  }
  return result;
}
