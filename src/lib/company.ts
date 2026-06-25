import type { Company, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";

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
    .single();

  if (fetchError && isMissingTableError(fetchError)) {
    return { company: null, missingTable: true, error: getDbErrorMessage(fetchError) };
  }

  // PGRST116 = keine Zeile gefunden → neues Unternehmen anlegen
  if (fetchError && fetchError.code !== "PGRST116") {
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
    .insert({ user_id: userId })
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
    .single();

  return (data as Company) ?? null;
}

export function isCompanyProfileComplete(company: Company | null): boolean {
  if (!company) return false;
  return Boolean(company.company_name && company.industry);
}
