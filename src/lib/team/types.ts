export const COMPANY_ROLES = [
  "owner",
  "admin",
  "it_responsible",
  "management",
  "employee",
  "auditor",
] as const;

export type CompanyRole = (typeof COMPANY_ROLES)[number];

export const INVITABLE_ROLES: CompanyRole[] = [
  "admin",
  "it_responsible",
  "management",
  "employee",
  "auditor",
];

export const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: "Owner",
  admin: "Admin",
  it_responsible: "IT-Verantwortlicher",
  management: "Management",
  employee: "Mitarbeiter",
  auditor: "Auditor / Prüfer",
};

export type MemberStatus = "active" | "deactivated";

export type InvitationStatus = "invited" | "active" | "deactivated" | "expired" | "revoked";

export interface CompanyMemberRow {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  active: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { email: string | null; full_name?: string | null; last_active_at?: string | null };
}

export interface CompanyInvitationRow {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  token: string;
  status: InvitationStatus;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}
