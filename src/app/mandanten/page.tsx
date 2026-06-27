import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MandantenPageClient } from "@/components/consultant/MandantenPageClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany, getOrCreateProfile } from "@/lib/company";
import {
  ensureDefaultMandanten,
  getActiveMandantId,
  listMandanten,
} from "@/lib/consultant/mandanten";
import { canUseFeature } from "@/lib/billingAccess";
import { isPlatformOwner } from "@/lib/jarvis/access";

export default async function MandantenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company: ownCompany, missingTable } = await getOrCreateCompany(user.id);
  const profile = await getOrCreateProfile(user.id, user.email);
  const platformOwner = isPlatformOwner(user.email, profile?.role);

  if (!canUseFeature(ownCompany, "multi_tenant", platformOwner)) {
    redirect("/settings");
  }

  if (ownCompany) {
    await ensureDefaultMandanten(user.id);
  }

  const { mandanten } = await listMandanten(user.id);
  const activeCompanyId = await getActiveMandantId();

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Meine Mandanten</h1>
        <p className="mt-1 text-slate-500">
          Verwalten Sie die NIS2-Compliance Ihrer Kunden — ein Klick wechselt in den Mandanten-Workspace.
        </p>
      </div>
      {ownCompany && (
        <MandantenPageClient
          mandanten={mandanten}
          activeCompanyId={activeCompanyId}
          ownCompanyId={ownCompany.id}
        />
      )}
    </DashboardShell>
  );
}
