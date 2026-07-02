import type { B2BOutreachLead } from "@/lib/types";
import { LEAD_FINDER_MIN_SCORE } from "@/lib/jarvis/outreach/constants";
import {
  computeLeadFinderFields,
  resolveLeadQualityScore,
} from "@/lib/jarvis/outreach/lead-finder-fields";
import { isLeadContactable } from "@/lib/jarvis/outreach/contact-enrichment";
import type { PartnerPotential } from "@/lib/jarvis/outreach/lead-quality-scoring";

export interface LeadFinderStats {
  totalFound: number;
  contactable: number;
  qualified: number;
  averageScore: number;
  whiteLabel: number;
  reseller: number;
  highPriority: number;
}

export interface LeadFinderViewLead extends B2BOutreachLead {
  resolved_quality_score: number;
  resolved_contactable: boolean;
  resolved_partner_potential: PartnerPotential;
  resolved_outreach_priority: string;
}

function enrichLeadForView(lead: B2BOutreachLead): LeadFinderViewLead {
  const computed = computeLeadFinderFields({
    company_name: lead.company_name,
    industry: lead.industry,
    employee_count: lead.employee_count,
    contact_email: lead.contact_email,
    contact_phone: lead.contact_phone,
    has_contact_form: lead.has_contact_form,
    linkedin_url: lead.linkedin_url,
    hints: lead.hints,
    lead_category: lead.lead_category,
    deprioritized: lead.deprioritized,
  });

  return {
    ...lead,
    resolved_quality_score: resolveLeadQualityScore(lead),
    resolved_contactable:
      lead.is_contactable ?? computed.is_contactable ?? isLeadContactable(lead),
    resolved_partner_potential:
      (lead.partner_potential as PartnerPotential) ?? computed.partner_potential,
    resolved_outreach_priority:
      lead.outreach_priority ?? computed.outreach_priority ?? "low",
  };
}

export function enrichLeadsForFinder(leads: B2BOutreachLead[]): LeadFinderViewLead[] {
  return leads.map(enrichLeadForView);
}

export function isLeadFinderQualified(lead: LeadFinderViewLead): boolean {
  return (
    lead.resolved_contactable &&
    lead.resolved_quality_score >= LEAD_FINDER_MIN_SCORE &&
    lead.resolved_partner_potential !== "end_customer"
  );
}

export function filterLeadFinderLeads(leads: B2BOutreachLead[]): LeadFinderViewLead[] {
  return enrichLeadsForFinder(leads)
    .filter(isLeadFinderQualified)
    .sort((a, b) => {
      if (b.resolved_quality_score !== a.resolved_quality_score) {
        return b.resolved_quality_score - a.resolved_quality_score;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

export function computeLeadFinderStats(leads: B2BOutreachLead[]): LeadFinderStats {
  const enriched = enrichLeadsForFinder(leads);
  const contactable = enriched.filter((l) => l.resolved_contactable);
  const qualified = enriched.filter(isLeadFinderQualified);

  const averageScore =
    qualified.length > 0
      ? Math.round(
          qualified.reduce((sum, l) => sum + l.resolved_quality_score, 0) / qualified.length
        )
      : 0;

  return {
    totalFound: leads.length,
    contactable: contactable.length,
    qualified: qualified.length,
    averageScore,
    whiteLabel: qualified.filter((l) => l.resolved_partner_potential === "white_label").length,
    reseller: qualified.filter((l) => l.resolved_partner_potential === "reseller").length,
    highPriority: qualified.filter((l) => l.resolved_outreach_priority === "high").length,
  };
}
