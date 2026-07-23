import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function findCompanyIdByEmail(email: string | null | undefined): Promise<string | null> {
  if (!email?.trim()) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const normalized = email.trim().toLowerCase();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (profile?.id) {
    // A consultant owns one company per mandant plus their own — all under
    // the same user_id — so this must stay narrowed to their own (non-
    // mandant) company, or .maybeSingle() silently returns null on the
    // ambiguity and the payment goes unattributed.
    const { data: company } = await admin
      .from("companies")
      .select("id")
      .eq("user_id", profile.id)
      .eq("is_mandant", false)
      .is("deleted_at", null)
      .maybeSingle();
    if (company?.id) return company.id;
  }

  const { data: byBillingEmail } = await admin
    .from("companies")
    .select("id")
    .ilike("billing_email", normalized)
    .eq("is_mandant", false)
    .is("deleted_at", null)
    .maybeSingle();

  return byBillingEmail?.id ?? null;
}

export async function findCompanyIdByStripeCustomer(
  customerId: string | null | undefined
): Promise<string | null> {
  if (!customerId) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("companies")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.id ?? null;
}
