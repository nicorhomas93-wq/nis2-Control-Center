import { DashboardShell } from "@/components/layout/DashboardShell";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { BillingSection } from "@/components/billing/BillingSection";
import { StripeTestModeBanner } from "@/components/billing/StripeTestModeBanner";
import { WhiteLabelSettings } from "@/components/settings/WhiteLabelSettings";
import { TeamMembersSettings } from "@/components/settings/TeamMembersSettings";
import { getCompanyMemberRole } from "@/lib/team/access";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany, getOrCreateProfile } from "@/lib/company";
import { isPlatformOwner } from "@/lib/jarvis/access";
import { canUseFeature } from "@/lib/billingAccess";
import { getConsultantSettings } from "@/lib/white-label/branding";
import { APP_VERSION } from "@/lib/app-config";
import { isOpenAIConfigured } from "@/lib/ai/generate";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { redirect } from "next/navigation";

function StatusBadge({ ok, labelOk, labelError }: { ok: boolean; labelOk: string; labelError: string }) {
  return (
    <Badge className={ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
      {ok ? labelOk : labelError}
    </Badge>
  );
}

function resolveAppMode(
  company: { is_demo?: boolean; plan?: string | null } | null,
  platformOwner: boolean
): string {
  if (platformOwner) return "Owner";
  if (company?.is_demo) return "Demo";
  if (company?.plan === "pilot" || !company?.plan) return "Pilot";
  if (company?.plan === "production" || company?.plan === "produktiv") return "Produktiv";
  return company?.plan ?? "Pilot";
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, missingTable } = await getOrCreateCompany(user.id);
  const profile = await getOrCreateProfile(user.id, user.email);
  const platformOwner = isPlatformOwner(user.email, profile?.role);
  const whiteLabelAllowed = canUseFeature(company, "white_label", platformOwner);
  const memberRole = company ? await getCompanyMemberRole(user.id, company.id) : null;
  const { settings: consultantSettings, missingTable: whiteLabelTableMissing } = company
    ? await getConsultantSettings(company.id)
    : { settings: null, missingTable: false };

  const openAiActive = isOpenAIConfigured();
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabaseOk = supabaseConfigured && !missingTable;

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="mt-1 text-slate-500">Konto, Abrechnung und Systemstatus.</p>
      </div>

      <StripeTestModeBanner />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Konto</CardTitle>
            <CardDescription>Ihre Anmeldedaten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600">Nutzer-E-Mail</span>
              <span className="font-medium text-slate-900">{user.email}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600">Rolle</span>
              <span className="font-medium text-slate-900">{profile?.role ?? company?.role ?? "user"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unternehmen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {company?.company_name ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600">Unternehmen</span>
                <span className="font-medium text-slate-900">{company.company_name}</span>
              </div>
            ) : (
              <p className="text-slate-600">
                Noch kein Unternehmensprofil.{" "}
                <Link href="/company" className="text-brand-600 hover:underline">
                  Jetzt ausfüllen
                </Link>
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600">Modus</span>
              <StatusBadge
                ok={resolveAppMode(company, platformOwner) !== "Demo"}
                labelOk={resolveAppMode(company, platformOwner)}
                labelError="Demo"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600">Plan</span>
              <span className="font-medium text-slate-900">
                {platformOwner ? "Owner (Vollzugang)" : company?.plan ?? profile?.plan ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abonnement & Abrechnung</CardTitle>
            <CardDescription>Plan, Status und Stripe-Kundenportal</CardDescription>
          </CardHeader>
          <CardContent>
            <BillingSection company={company} platformOwner={platformOwner} />
          </CardContent>
        </Card>

        <TeamMembersSettings companyId={company?.id ?? null} currentRole={memberRole} />

        <WhiteLabelSettings
          allowed={whiteLabelAllowed}
          companyId={company?.id ?? null}
          initialSettings={consultantSettings}
          missingTable={whiteLabelTableMissing}
        />

        <Card>
          <CardHeader>
            <CardTitle>Systemstatus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600">OpenAI</span>
              <StatusBadge
                ok={openAiActive}
                labelOk="Aktiv"
                labelError="Demo-Fallback aktiv"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600">Supabase</span>
              <StatusBadge
                ok={supabaseOk}
                labelOk="Verbunden"
                labelError={missingTable ? "Tabelle fehlt" : "Fehler / nicht konfiguriert"}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600">App-Version</span>
              <span className="font-mono text-slate-900">{APP_VERSION}</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400">
          <Link href="/legal" className="hover:text-brand-600">
            Rechtliche Hinweise
          </Link>
        </p>
      </div>
    </DashboardShell>
  );
}
