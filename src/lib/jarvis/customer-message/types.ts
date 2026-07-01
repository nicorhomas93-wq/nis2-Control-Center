export type CustomerEntityType = "jarvis_lead" | "b2b_outreach_lead";

export type CustomerMessageChannel = "email" | "whatsapp" | "internal";

export type CustomerMessageStatus = "logged" | "sent" | "failed";

export type CustomerMessageSource = "manual" | "automatic";

import type { AutomationTriggerType } from "@/lib/jarvis/customer-message/automation-triggers";

export type { AutomationTriggerType };

export interface CustomerMessageTarget {
  entityType: CustomerEntityType;
  entityId: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  defaultBody?: string | null;
  consentBlocked?: boolean;
}

export interface CustomerMessage {
  id: string;
  entity_type: CustomerEntityType;
  entity_id: string;
  channel: CustomerMessageChannel;
  subject: string | null;
  body: string;
  status: CustomerMessageStatus;
  source: CustomerMessageSource;
  trigger_type: AutomationTriggerType | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  sent_by: string | null;
  created_at: string;
}
