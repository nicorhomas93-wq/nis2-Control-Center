import {
  scoreLeadQuality,
  type LeadQualityInput,
  type LeadQualityResult,
} from "@/lib/jarvis/outreach/lead-quality-scoring";

export function leadFinderFieldsFromQuality(
  quality: LeadQualityResult,
  contact: {
    contact_email?: string | null;
    contact_phone?: string | null;
    has_contact_form?: boolean;
    linkedin_url?: string | null;
  } = {}
): Record<string, unknown> {
  return {
    lead_quality_score: quality.lead_quality_score,
    lead_quality_reason: quality.lead_quality_reason,
    is_contactable: quality.is_contactable,
    partner_potential: quality.partner_potential,
    outreach_priority: quality.outreach_priority,
    contact_email: contact.contact_email?.trim() || null,
    contact_phone: contact.contact_phone?.trim() || null,
    has_contact_form: Boolean(contact.has_contact_form),
    linkedin_url: contact.linkedin_url?.trim() || null,
  };
}

export function computeLeadFinderFields(
  input: LeadQualityInput & {
    contact_email?: string | null;
    contact_phone?: string | null;
    has_contact_form?: boolean;
    linkedin_url?: string | null;
  }
): LeadQualityResult & Record<string, unknown> {
  const quality = scoreLeadQuality(input);
  return {
    ...quality,
    ...leadFinderFieldsFromQuality(quality, input),
  };
}

export function resolveLeadQualityScore(lead: {
  lead_quality_score?: number | null;
  company_name: string;
  industry?: string | null;
  employee_count?: string | number | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  has_contact_form?: boolean;
  linkedin_url?: string | null;
  hints?: string | null;
  lead_category?: string | null;
  deprioritized?: boolean;
}): number {
  if (lead.lead_quality_score != null) return lead.lead_quality_score;
  return scoreLeadQuality({
    company_name: lead.company_name,
    industry: lead.industry ?? null,
    employee_count: lead.employee_count,
    contact_email: lead.contact_email,
    contact_phone: lead.contact_phone,
    has_contact_form: lead.has_contact_form,
    linkedin_url: lead.linkedin_url,
    hints: lead.hints,
    lead_category: lead.lead_category,
    deprioritized: lead.deprioritized,
  }).lead_quality_score;
}
