import type { Company, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { resolveWorkspaceCompany } from "@/lib/consultant/mandanten";
import { activeOnly } from "@/lib/supabase/soft-delete";

export async function getOrCreateProfile(
  userId: string,
  email?: string
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (existing) return existing as Profile;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: userId, email: email ?? null })
    .select()
    .single();

  if (error && !isMissingTableError(error)) {
    console.error("Failed to create profile:", error);
  }

  return created as Profile | null;
}

export async function getOrCreateCompany(
  userId: string
): Promise<{ company: Company | null; missingTable: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await activeOnly(
    supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .eq("is_mandant", false)
  ).maybeSingle();

  if (fetchError && isMissingTableError(fetchError)) {
    return { company: null, missingTable: true, error: getDbErrorMessage(fetchError) };
  }

  if (fetchError) {
    return {
      company: null,
      missingTable: false,
      error: getDbErrorMessage(fetchError),
    };
  }

  if (existing) {
    return { company: existing as Company, missingTable: false, error: null };
  }

  const { data: membership, error: memberError } = await supabase
    .from("company_members")
    .select("company_id, companies(*)")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError && isMissingTableError(memberError)) {
    return { company: null, missingTable: true, error: getDbErrorMessage(memberError) };
  }

  const teamCompanyRaw = membership?.companies;
  const teamCompany = (
    Array.isArray(teamCompanyRaw) ? teamCompanyRaw[0] : teamCompanyRaw
  ) as Company | null | undefined;
  if (teamCompany && !teamCompany.deleted_at) {
    return { company: teamCompany, missingTable: false, error: null };
  }

  const { data: created, error: createError } = await supabase
    .from("companies")
    .insert({ user_id: userId, is_mandant: false })
    .select()
    .single();

  if (createError) {
    return {
      company: null,
      missingTable: isMissingTableError(createError),
      error: getDbErrorMessage(createError),
    };
  }

  return { company: created as Company, missingTable: false, error: null };
}

export { verifyCompanyAccess, verifyCompanyOwnership } from "@/lib/team/access";

export async function getWorkspaceCompany(
  userId: string
): Promise<{
  company: Company | null;
  ownCompany: Company | null;
  missingTable: boolean;
  error: string | null;
  isViewingMandant: boolean;
}> {
  const base = await getOrCreateCompany(userId);
  if (!base.company) {
    return {
      company: null,
      ownCompany: null,
      missingTable: base.missingTable,
      error: base.error,
      isViewingMandant: false,
    };
  }

  const workspace = await resolveWorkspaceCompany(userId, base.company);
  return {
    company: workspace.company,
    ownCompany: base.company,
    missingTable: base.missingTable,
    error: base.error,
    isViewingMandant: workspace.isViewingMandant,
  };
}

export function isCompanyProfileComplete(company: Company | null): boolean {
  if (!company) return false;
  return Boolean(company.company_name && company.industry);
}
