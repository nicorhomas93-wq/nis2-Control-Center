import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/types";
import { activeOnly } from "@/lib/supabase/soft-delete";
import type { CompanyRole } from "@/lib/team/types";
import { hasPermission, type Permission } from "@/lib/team/permissions";

export interface CompanyAccess {
  company: Company;
  role: CompanyRole;
}

export async function getCompanyMemberRole(
  userId: string,
  companyId: string
): Promise<CompanyRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  return (data?.role as CompanyRole) ?? null;
}

export async function verifyCompanyAccess(
  userId: string,
  companyId: string,
  required?: Permission
): Promise<CompanyAccess | null> {
  const supabase = await createClient();

  const { data: company } = await activeOnly(
    supabase.from("companies").select("*").eq("id", companyId)
  ).maybeSingle();

  if (!company) return null;

  const memberRole = await getCompanyMemberRole(userId, companyId);
  if (memberRole) {
    if (required && !hasPermission(memberRole, required)) return null;
    return { company: company as Company, role: memberRole };
  }

  if ((company as Company).user_id === userId) {
    const role: CompanyRole = "owner";
    if (required && !hasPermission(role, required)) return null;
    return { company: company as Company, role };
  }

  return null;
}

/** Rückwärtskompatibel: prüft Owner oder Team-Mitglied. */
export async function verifyCompanyOwnership(
  userId: string,
  companyId: string
): Promise<Company | null> {
  const access = await verifyCompanyAccess(userId, companyId);
  return access?.company ?? null;
}

export async function requireCompanyPermission(
  userId: string,
  companyId: string,
  permission: Permission
): Promise<CompanyAccess | { error: string; status: number }> {
  const access = await verifyCompanyAccess(userId, companyId, permission);
  if (!access) {
    return { error: "Kein Zugriff auf dieses Unternehmen", status: 403 };
  }
  return access;
}
