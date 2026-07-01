import type {
  DetectedWebsiteType,
  WebPresenceEvidence,
  WebPresenceStatus,
} from "@/lib/jarvis/outreach/web-presence-types";
import type { VendorApplicability } from "@/lib/vendors/types";

export type { DetectedWebsiteType, WebPresenceEvidence, WebPresenceStatus };
export type { CompanyAsset, AssetCategory, AssetCriticality } from "@/lib/assets/types";
export type {
  CompanyVendor,
  VendorEvidence,
  VendorAssessment,
  VendorWithDetails,
  VendorDashboardStats,
  VendorCriticality,
  VendorRiskLevel,
  VendorCategory,
  VendorStatus,
  VendorEvidenceType,
  VendorEvidenceStatus,
  VendorQuestionnaireAnswers,
  VendorApplicability,
} from "@/lib/vendors/types";

export type Nis2Status =
  | "unbekannt"
  | "nicht_betroffen"
  | "moeglicherweise_betroffen"
  | "wahrscheinlich_wichtige_einrichtung"
  | "wahrscheinlich_besonders_wichtige_einrichtung";

export type MeasureStatus = "open" | "in_progress" | "completed";
export type MeasurePriority = "high" | "medium" | "low";
export type DocumentStatus = "draft" | "published";
export type RiskLevel = "high" | "medium" | "low";
export type IncidentStatus =
  | "open"
  | "investigating"
  | "waiting_feedback"
  | "documentation_open"
  | "completed"
  | "resolved"
  | "closed";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  plan?: string | null;
  role?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  company_name: string | null;
  industry: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  balance_sheet_total: number | null;
  country: string | null;
  eu_operations: boolean;
  uses_microsoft_365: boolean;
  uses_cloud_services: boolean;
  critical_business_processes: string | null;
  has_it_service_provider: boolean;
  publicly_accessible_systems: boolean;
  security_contact_name: string | null;
  security_contact_email: string | null;
  nis2_status: Nis2Status;
  compliance_score: number;
  plan?: string | null;
  role?: string | null;
  is_demo?: boolean;
  is_mandant?: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  access_enabled?: boolean;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
  billing_email?: string | null;
  pilot_setup_paid_at?: string | null;
  pilot_phase_completed_at?: string | null;
  security_score?: number | null;
  vendors_applicability?: VendorApplicability | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  company_id: string | null;
  stripe_event_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface CompanyFormData {
  company_name: string;
  industry: string;
  employee_count: number | null;
  annual_revenue: number | null;
  balance_sheet_total: number | null;
  country: string;
  eu_operations: boolean;
  uses_microsoft_365: boolean;
  uses_cloud_services: boolean;
  critical_business_processes: string;
  has_it_service_provider: boolean;
  publicly_accessible_systems: boolean;
  security_contact_name: string;
  security_contact_email: string;
}

export interface Nis2Assessment {
  id: string;
  company_id: string;
  result: Nis2Status;
  reasoning: string | null;
  score: number;
  created_at: string;
}

export interface Document {
  id: string;
  company_id: string;
  title: string;
  document_type: string;
  content: string | null;
  status: DocumentStatus;
  version: number;
  generation_mode?: "openai" | "demo" | null;
  is_mandatory?: boolean;
  criticality?: string | null;
  deadline?: string | null;
  escalation_level?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Measure {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: MeasureStatus;
  priority: MeasurePriority;
  responsible: string | null;
  target_state: string | null;
  is_mandatory?: boolean;
  criticality?: string | null;
  deadline?: string | null;
  escalation_level?: number | null;
  asset_id?: string | null;
  risk_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  id: string;
  company_id: string;
  asset: string;
  threat: string;
  risk_level: RiskLevel;
  measure: string | null;
  vulnerability?: string | null;
  business_impact?: string | null;
  analysis_content: string | null;
  is_mandatory?: boolean;
  criticality?: string | null;
  deadline?: string | null;
  escalation_level?: number | null;
  responsible?: string | null;
  asset_id?: string | null;
  treatment_status?: "open" | "treated" | "reduced" | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: IncidentStatus;
  report_content: string | null;
  is_mandatory?: boolean;
  criticality?: string | null;
  deadline?: string | null;
  escalation_level?: number | null;
  responsible?: string | null;
  incident_summary?: string | null;
  root_cause?: string | null;
  affected_assets?: string | null;
  affected_persons?: string | null;
  affected_systems?: string | null;
  data_categories?: string | null;
  estimated_impact?: string | null;
  containment_actions?: import("@/lib/incidents/types").IncidentActionItem[] | null;
  corrective_actions?: import("@/lib/incidents/types").IncidentActionItem[] | null;
  preventive_actions?: import("@/lib/incidents/types").IncidentActionItem[] | null;
  communication_required?: boolean;
  employee_letter_required?: boolean;
  employee_recipient_name?: string | null;
  employee_recipient_email?: string | null;
  employee_letter_text?: string | null;
  management_report_text?: string | null;
  audit_report_text?: string | null;
  completion_notes?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  evidence_links?: string | null;
  generated_documents?: import("@/lib/incidents/types").GeneratedIncidentDocument[] | null;
  created_at: string;
  updated_at: string;
}

export interface AuditExport {
  id: string;
  company_id: string;
  export_data: Record<string, unknown> | null;
  created_at: string;
}

export interface PilotRequest {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  industry: string | null;
  message: string | null;
  created_at: string;
}

export type LeadStatus =
  | "new"
  | "qualified"
  | "contacted"
  | "replied"
  | "demo_scheduled"
  | "proposal_sent"
  | "won"
  | "lost"
  | "not_relevant";

export type ConsentStatus =
  | "unknown"
  | "opt_in"
  | "legitimate_interest"
  | "no_contact";

export interface Lead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  source: string | null;
  status: LeadStatus;
  lead_score: number;
  notes: string | null;
  consent_status: ConsentStatus;
  created_at: string;
  updated_at: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  type: string;
  direction: string;
  subject: string | null;
  content: string | null;
  status: string;
  created_at: string;
  lead?: Lead;
}

export interface SalesTask {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  lead?: Lead;
}

export interface EmailTemplate {
  id: string;
  name: string;
  purpose: string | null;
  subject: string;
  body: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JarvisEvent {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface TrafficTargetGroup {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  company_size: string | null;
  pain_points: string | null;
  value_proposition: string | null;
  priority: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrafficSearchProfile {
  id: string;
  target_group_id: string | null;
  name: string;
  platform: string | null;
  search_query: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  target_group?: TrafficTargetGroup | null;
}

export interface OutreachDraft {
  id: string;
  target_group_id: string | null;
  channel: string | null;
  purpose: string | null;
  subject: string | null;
  body: string | null;
  tone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  target_group?: TrafficTargetGroup | null;
}

export interface ContentIdea {
  id: string;
  title: string;
  platform: string | null;
  content_type: string | null;
  hook: string | null;
  outline: string | null;
  call_to_action: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficCampaign {
  id: string;
  name: string;
  target_group_id: string | null;
  goal: string | null;
  weekly_target: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  target_group?: TrafficTargetGroup | null;
}

export interface TrafficTask {
  id: string;
  campaign_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  campaign?: TrafficCampaign | null;
}

export type B2BOutreachStatus =
  | "new"
  | "ready"
  | "contacted"
  | "replied"
  | "customer"
  | "skipped";

export type Nis2Likelihood = "yes" | "no" | "uncertain";
export type ItMaturity = "low" | "medium" | "high" | "unknown";

export interface B2BOutreachLead {
  id: string;
  company_name: string;
  industry: string | null;
  city: string | null;
  region: string | null;
  website: string | null;
  employee_count: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  source: string;
  nis2_likelihood: Nis2Likelihood;
  nis2_relevance_score: number | null;
  it_maturity: ItMaturity;
  hints: string | null;
  analysis_bullets: string[];
  observation: string | null;
  outreach_hook: string | null;
  outreach_message: string | null;
  status: B2BOutreachStatus;
  processed_at: string | null;
  contacted_at: string | null;
  detected_website_url?: string | null;
  detected_website_type?: DetectedWebsiteType | null;
  web_presence_status?: WebPresenceStatus | null;
  web_presence_confidence?: number | null;
  web_presence_note?: string | null;
  web_presence_evidence?: WebPresenceEvidence[];
  created_at: string;
  updated_at: string;
}

export interface AssessmentResult {
  status: Nis2Status;
  reasoning: string;
  score: number;
  nextSteps: string[];
}

export type DocumentType =
  | "nis2_betroffenheitsanalyse"
  | "informationssicherheitsleitlinie"
  | "risikoanalyse"
  | "massnahmenplan"
  | "incident_response_plan"
  | "backup_konzept"
  | "zugriffskonzept"
  | "lieferantenbewertung"
  | "meldeprozess"
  | "management_zusammenfassung";

export interface ActivityItem {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface DbResult<T> {
  data: T | null;
  error: string | null;
  missingTable: boolean;
}
