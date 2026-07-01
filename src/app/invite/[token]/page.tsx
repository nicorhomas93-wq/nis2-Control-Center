import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/lib/team/types";
import {
  acceptInvitation,
  getInvitationByToken,
  markInvitationExpired,
  normalizeInviteToken,
} from "@/lib/team/invitation-token";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = normalizeInviteToken(rawToken);
  const invitation = await getInvitationByToken(token);

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
    await markInvitationExpired(invitation.id);
    redirect("/login?error=invite_expired");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  const result = await acceptInvitation({
    invitation,
    userId: user.id,
    userEmail: user.email ?? null,
    token,
  });

  if (!result.ok && result.code === "expired") {
    redirect("/login?error=invite_expired");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{result.ok ? "Willkommen im Team" : "Einladung konnte nicht angenommen werden"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {!result.ok ? (
            <>
              <p className="text-red-600">{result.error}</p>
              {result.code === "email_mismatch" ? (
                <Link
                  href={`/login?redirect=/invite/${token}`}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mit anderer E-Mail anmelden
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Zur Anmeldung
                </Link>
              )}
            </>
          ) : (
            <>
              <p>
                Sie wurden zu <strong>{invitation.company_name ?? "einem Unternehmen"}</strong> als{" "}
                <strong>{ROLE_LABELS[invitation.role]}</strong> hinzugefügt.
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
