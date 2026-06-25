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
    const { data: company } = await admin
      .from("companies")
      .select("id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (company?.id) return company.id;
  }

  const { data: byBillingEmail } = await admin
    .from("companies")
    .select("id")
    .ilike("billing_email", normalized)
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
