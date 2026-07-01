import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { OwnerPageClient } from "@/components/owner/OwnerPageClient";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/company";
import { isPlatformOwner } from "@/lib/jarvis/access";

export default async function OwnerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user.id, user.email);
  if (!isPlatformOwner(user.email, profile?.role)) {
    redirect("/dashboard");
  }

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Owner-Verwaltung</h1>
        <p className="mt-1 text-slate-500">
          Sichere Löschfunktion mit Papierkorb — nur für Plattform-Owner sichtbar.
        </p>
      </div>
      <OwnerPageClient />
    </DashboardShell>
  );
}
