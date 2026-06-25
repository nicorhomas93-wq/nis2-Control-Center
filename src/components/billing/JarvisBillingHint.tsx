import { UpgradeHint } from "@/components/billing/UpgradeHint";
import { getOrCreateCompany } from "@/lib/company";
import { needsUpgradeForJarvis } from "@/lib/billingAccess";
import { createClient } from "@/lib/supabase/server";

export async function JarvisBillingHint() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { company } = await getOrCreateCompany(user.id);
  if (!needsUpgradeForJarvis(company)) return null;

  return (
    <UpgradeHint message="Jarvis Sales ist im Business-, Pilot- oder Consultant-Plan enthalten." />
  );
}
