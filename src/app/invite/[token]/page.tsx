import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/lib/team/types";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invitation } = await supabase
    .from("company_invitations")
    .select("*, companies(company_name)")
    .eq("token", token)
    .eq("status", "invited")
    .maybeSingle();

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Einladung ungültig</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>Diese Einladung ist abgelaufen, widerrufen oder bereits verwendet.</p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Zur Anmeldung
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from("company_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    redirect("/login?error=invite_expired");
  }

  if (!user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  const companyName = Array.isArray(invitation.companies)
    ? invitation.companies[0]?.company_name
    : (invitation.companies as { company_name?: string } | null)?.company_name;

  const { error: memberError } = await supabase.from("company_members").upsert(
    {
      company_id: invitation.company_id,
      user_id: user.id,
      role: invitation.role,
      active: true,
      invited_by: invitation.invited_by,
    },
    { onConflict: "company_id,user_id" }
  );

  if (!memberError) {
    await supabase
      .from("company_invitations")
      .update({
        status: "active",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    await supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Willkommen im Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {memberError ? (
            <p className="text-red-600">
              Einladung konnte nicht angenommen werden. Bitte Administrator kontaktieren.
            </p>
          ) : (
            <>
              <p>
                Sie wurden zu <strong>{companyName ?? "einem Unternehmen"}</strong> als{" "}
                <strong>{ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS]}</strong> hinzugefügt.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Zum Dashboard
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
