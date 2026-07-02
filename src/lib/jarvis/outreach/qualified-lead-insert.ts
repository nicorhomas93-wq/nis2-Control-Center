import type { QualifiedLeadInput } from "@/lib/jarvis/outreach/qualified-lead-types";
import type { QualifiedScoreResult } from "@/lib/jarvis/outreach/qualified-lead-types";
import { partnerFieldsFromScoreResult } from "@/lib/jarvis/outreach/partner-fields";
import { computeLeadFinderFields } from "@/lib/jarvis/outreach/lead-finder-fields";

export function buildQualifiedLeadInsert(
  lead: QualifiedLeadInput,
  scoreResult: QualifiedScoreResult
): Record<string, unknown> | null {
  const finder = computeLeadFinderFields({
    company_name: lead.company_name,
    industry: lead.industry,
    employee_count: lead.employee_count,
    contact_email: lead.contact_email,
    contact_phone: lead.contact_phone,
    has_contact_form: lead.has_contact_form,
    linkedin_url: lead.linkedin_url,
    hints: lead.hints,
    lead_category: scoreResult.lead_category,
    deprioritized: scoreResult.deprioritized,
  });

  if (!finder.qualifies_for_finder) return null;

  return {
    company_name: lead.company_name,
    industry: lead.industry,
    city: lead.city,
    website: lead.website ?? null,
    employee_count: String(lead.employee_count),
    contact_role: lead.contact_role ?? null,
    contact_email: lead.contact_email ?? null,
    contact_phone: lead.contact_phone ?? null,
    has_contact_form: lead.has_contact_form ?? false,
    linkedin_url: lead.linkedin_url ?? null,
    hints: lead.hints ?? null,
    ...partnerFieldsFromScoreResult(scoreResult),
    lead_quality_score: finder.lead_quality_score,
    lead_quality_reason: finder.lead_quality_reason,
    is_contactable: finder.is_contactable,
    partner_potential: finder.partner_potential,
    outreach_priority: finder.outreach_priority,
    status: scoreResult.deprioritized ? "review_later" : "new",
  };
}
