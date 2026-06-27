import type { Company, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { resolveWorkspaceCompany } from "@/lib/consultant/mandanten";

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

  const { data: existing, error: fetchError } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .eq("is_mandant", false)
    .maybeSingle();

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

export async function verifyCompanyOwnership(
  userId: string,
  companyId: string
): Promise<Company | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as Company) ?? null;
}

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
