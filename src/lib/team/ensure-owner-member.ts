import { createAdminClient } from "@/lib/supabase/admin";

/** Stellt sicher, dass der Firmeninhaber in company_members als owner eingetragen ist. */
export async function ensureOwnerMembership(
  companyId: string,
  ownerUserId: string
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: existing } = await admin
    .from("company_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", ownerUserId)
    .maybeSingle();

  if (existing) return;

  await admin.from("company_members").insert({
    company_id: companyId,
    user_id: ownerUserId,
    role: "owner",
    active: true,
    invited_by: ownerUserId,
  });
}
