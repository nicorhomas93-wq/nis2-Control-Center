import { cookies } from "next/headers";
import type { Company } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { activeOnly } from "@/lib/supabase/soft-delete";

export const ACTIVE_MANDANT_COOKIE = "tknd_active_company_id";

export const DEFAULT_MANDANTEN: Array<{
  company_name: string;
  industry: string;
}> = [
  { company_name: "Müller GmbH", industry: "Maschinenbau" },
  { company_name: "Autohaus Schneider", industry: "Automobilhandel" },
  { company_name: "Pflegezentrum Dresden", industry: "Gesundheitswesen" },
  { company_name: "Bauunternehmen Weber", industry: "Bauwesen" },
];

export async function listMandanten(
  userId: string
): Promise<{ mandanten: Company[]; missingTable: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await activeOnly(
    supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .eq("is_mandant", true)
      .order("company_name", { ascending: true })
  );

  if (error) {
    return {
      mandanten: [],
      missingTable: isMissingTableError(error),
      error: getDbErrorMessage(error),
    };
  }

  return { mandanten: (data ?? []) as Company[], missingTable: false, error: null };
}

export async function createMandant(
  userId: string,
  input: { company_name: string; industry?: string | null }
): Promise<{ mandant: Company | null; error: string | null }> {
  const name = input.company_name.trim();
  if (!name) {
    return { mandant: null, error: "Firmenname ist erforderlich." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({
      user_id: userId,
      is_mandant: true,
      company_name: name,
      industry: input.industry?.trim() || null,
      country: "DE",
    })
    .select()
    .single();

  if (error) {
    return { mandant: null, error: getDbErrorMessage(error) };
  }

  return { mandant: data as Company, error: null };
}

export async function ensureDefaultMandanten(userId: string): Promise<void> {
  const { mandanten } = await listMandanten(userId);
  if (mandanten.length > 0) return;

  for (const seed of DEFAULT_MANDANTEN) {
    await createMandant(userId, seed);
  }
}

export async function getActiveMandantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_MANDANT_COOKIE)?.value ?? null;
}

export async function resolveWorkspaceCompany(
  userId: string,
  ownCompany: Company
): Promise<{ company: Company; isViewingMandant: boolean }> {
  const activeId = await getActiveMandantId();
  if (!activeId || activeId === ownCompany.id) {
    return { company: ownCompany, isViewingMandant: false };
  }

  const supabase = await createClient();
  const { data: mandant } = await activeOnly(
    supabase
      .from("companies")
      .select("*")
      .eq("id", activeId)
      .eq("user_id", userId)
      .eq("is_mandant", true)
  ).maybeSingle();

  if (mandant) {
    return { company: mandant as Company, isViewingMandant: true };
  }

  return { company: ownCompany, isViewingMandant: false };
}
