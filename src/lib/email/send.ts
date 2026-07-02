import {
  sendOutboundEmail,
  type OutboundEmailMethod,
} from "@/lib/email/outbound";

export type SendEmailResult = {
  sent: boolean;
  method?: "resend" | "smtp" | "graph";
  error?: string;
};

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const result = await sendOutboundEmail({
    to: options.to,
    subject: options.subject,
    body: options.body,
    html: options.html,
    from: options.from,
    replyTo: options.replyTo,
  });

  return {
    sent: result.sent,
    method: result.method as OutboundEmailMethod | undefined,
    error: result.error,
  };
}
