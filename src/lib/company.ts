import type { Company, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { resolveWorkspaceCompany } from "@/lib/consultant/mandanten";
import { activeOnly } from "@/lib/supabase/soft-delete";

function isEmptyShellCompany(company: Company): boolean {
  return !company.company_name?.trim() && !company.industry?.trim();
}

function normalizeJoinedCompany(raw: unknown): Company | null {
  const company = (Array.isArray(raw) ? raw[0] : raw) as Company | null | undefined;
  if (!company || company.deleted_at) return null;
  return company;
}

async function fetchOwnedCompany(userId: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await activeOnly(
    supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .eq("is_mandant", false)
  ).maybeSingle();

  if (error && isMissingTableError(error)) return null;
  if (error || !data) return null;
  return data as Company;
}

async function fetchTeamCompany(userId: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("company_members")
    .select("company_id, companies(*)")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && isMissingTableError(error)) return null;
  return normalizeJoinedCompany(membership?.companies);
}

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

  const owned = await fetchOwnedCompany(userId);
  const team = await fetchTeamCompany(userId);

  if (owned && !isEmptyShellCompany(owned)) {
    return { company: owned, missingTable: false, error: null };
  }

  if (team) {
    return { company: team, missingTable: false, error: null };
  }

  if (owned) {
    return { company: owned, missingTable: false, error: null };
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

  const owned = await fetchOwnedCompany(userId);
  const ownForMandant =
    owned && !isEmptyShellCompany(owned) ? owned : base.company;

  const workspace = await resolveWorkspaceCompany(userId, ownForMandant);
  return {
    company: workspace.company,
    ownCompany: owned ?? base.company,
    missingTable: base.missingTable,
    error: base.error,
    isViewingMandant: workspace.isViewingMandant,
  };
}

export function isCompanyProfileComplete(company: Company | null): boolean {
  if (!company) return false;
  return Boolean(company.company_name && company.industry);
}
