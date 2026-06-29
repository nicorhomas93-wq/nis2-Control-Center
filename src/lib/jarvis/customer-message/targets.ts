import type { B2BOutreachLead, Lead } from "@/lib/types";
import type { CustomerMessageTarget } from "@/lib/jarvis/customer-message/types";

export function customerMessageTargetFromLead(lead: Lead): CustomerMessageTarget {
  return {
    entityType: "jarvis_lead",
    entityId: lead.id,
    companyName: lead.company_name ?? "Unbekannt",
    contactName: lead.contact_name,
    email: lead.email,
    phone: lead.phone,
    defaultBody: lead.notes,
    consentBlocked: lead.consent_status === "no_contact",
  };
}

export function customerMessageTargetFromB2BLead(lead: B2BOutreachLead): CustomerMessageTarget {
  return {
    entityType: "b2b_outreach_lead",
    entityId: lead.id,
    companyName: lead.company_name,
    contactName: lead.contact_name,
    email: lead.contact_email,
    phone: null,
    defaultBody: lead.outreach_message,
  };
}
