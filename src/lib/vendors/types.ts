export type VendorCriticality = "low" | "medium" | "high" | "critical";
export type VendorRiskLevel = "low" | "medium" | "high" | "critical";
export type VendorStatus = "active" | "inactive";

export type VendorCategory =
  | "cloud"
  | "hosting"
  | "saas"
  | "rechenzentrum"
  | "managed_services"
  | "it_dienstleister"
  | "softwareanbieter"
  | "telekommunikation"
  | "sonstiger";

export type VendorEvidenceType =
  | "iso_27001"
  | "tisax"
  | "datenschutzvereinbarung"
  | "av_vertrag"
  | "toms"
  | "sla"
  | "notfallkonzept"
  | "versicherungsnachweis"
  | "selbstauskunft"
  | "other";

export type VendorEvidenceStatus =
  | "fulfilled"
  | "not_fulfilled"
  | "in_progress"
  | "not_applicable";

export type VendorApplicability = "yes" | "no" | "unknown";

export type VendorQuestionnaireAnswer = "yes" | "no" | "unknown";

export interface VendorQuestionnaireAnswers {
  iso_27001?: VendorQuestionnaireAnswer;
  processes_personal_data?: VendorQuestionnaireAnswer;
  notfallkonzept?: VendorQuestionnaireAnswer;
  info_security_policy?: VendorQuestionnaireAnswer;
  security_incidents_12m?: VendorQuestionnaireAnswer;
}

export interface CompanyVendor {
  id: string;
  company_id: string;
  name: string;
  category: VendorCategory;
  provider_key: string | null;
  contact_name: string | null;
  contact_email: string | null;
  website: string | null;
  description: string | null;
  criticality: VendorCriticality;
  risk_level: VendorRiskLevel;
  vendor_score: number;
  processes_personal_data: boolean;
  last_assessed_at: string | null;
  next_review_at: string | null;
  status: VendorStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface VendorEvidence {
  id: string;
  vendor_id: string;
  company_id: string;
  evidence_type: VendorEvidenceType;
  status: VendorEvidenceStatus;
  valid_until: string | null;
  reviewed_at: string | null;
  file_name: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorAssessment {
  id: string;
  vendor_id: string;
  company_id: string;
  version: number;
  assessed_at: string;
  assessed_by: string | null;
  criticality: VendorCriticality;
  risk_level: VendorRiskLevel;
  vendor_score: number;
  questionnaire_score: number;
  evidence_score: number;
  questionnaire_answers: VendorQuestionnaireAnswers;
  evidence_snapshot: Record<string, VendorEvidenceStatus>;
  summary: string | null;
  notes: string | null;
  created_at: string;
}

export interface VendorWithDetails extends CompanyVendor {
  evidence: VendorEvidence[];
  assessments: VendorAssessment[];
}

export interface VendorDashboardStats {
  totalVendors: number;
  criticalVendors: number;
  missingEvidenceCount: number;
  reviewsDueCount: number;
  averageScore: number;
  applicability: VendorApplicability;
  notApplicable: boolean;
}
