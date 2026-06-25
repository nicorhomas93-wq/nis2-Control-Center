export type AcquisitionEventType =
  | "page_view"
  | "page_leave"
  | "cta_click"
  | "check_started"
  | "check_completed"
  | "email_captured"
  | "upgrade_click"
  | "retargeting_triggered";

export type AcquisitionLeadStatus = "new" | "nurturing" | "converted" | "lost";

export type TrafficChannel = "organic" | "tool" | "retargeting" | "linkedin" | "paid";

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

export interface AcquisitionVisitor {
  id: string;
  visitor_id: string;
  visit_count: number;
  lead_score: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  retargeting_eligible: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

export interface AcquisitionLead {
  id: string;
  visitor_id: string | null;
  email: string | null;
  company_name: string | null;
  industry: string | null;
  company_size: string | null;
  funnel_result: Record<string, unknown> | null;
  acquisition_score: number;
  funnel_score: number | null;
  source: string;
  status: AcquisitionLeadStatus;
  strong_offer_eligible: boolean;
  jarvis_lead_id: string | null;
  email_sequence_step: number;
  next_email_at: string | null;
  created_at: string;
}

export interface AcquisitionScoreResult {
  score: number;
  strongOfferEligible: boolean;
  reasons: string[];
}

export const ACQUISITION_VISITOR_COOKIE = "tknd_vid";
export const STRONG_OFFER_THRESHOLD = 60;
