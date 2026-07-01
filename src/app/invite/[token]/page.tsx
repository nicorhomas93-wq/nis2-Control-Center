import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/lib/team/types";
import { InviteAuthGate } from "@/components/auth/InviteAuthGate";
import { PENDING_INVITE_COOKIE } from "@/lib/auth/invite-cookie";
import {
  acceptInvitation,
  getInvitationByToken,
  getInvitationByTokenAnyStatus,
  markInvitationExpired,
  normalizeInviteToken,
} from "@/lib/team/invitation-token";

export const dynamic = "force-dynamic";

function clearInviteCookie() {
  const cookieStore = cookies();
  void cookieStore.then((store) => store.delete(PENDING_INVITE_COOKIE));
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = normalizeInviteToken(rawToken);
  let invitation = await getInvitationByToken(token);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!invitation && user) {
    const accepted = await getInvitationByTokenAnyStatus(token);
    if (accepted?.status === "active") {
      invitation = accepted;
    }
  }

  if (!invitation) {
    clearInviteCookie();

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Einladung ungültig</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>Diese Einladung ist abgelaufen, widerrufen oder bereits verwendet.</p>
            <Link
              href="/dashboard?clear_invite=1"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Zum Dashboard
            </Link>
            <Link
              href="/login?clear_invite=1&to=/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Zur Anmeldung
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (new Date(invitation.expires_at) < new Date() && invitation.status === "invited") {
    await markInvitationExpired(invitation.id);
    redirect("/login?error=invite_expired");
  }

  if (!user) {
    return <InviteAuthGate invitation={invitation} token={token} />;
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

  clearInviteCookie();

  const alreadyMember = invitation.status === "active" && result.ok;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>
            {result.ok
              ? alreadyMember
                ? "Sie sind bereits im Team"
                : "Willkommen im Team"
              : "Einladung konnte nicht angenommen werden"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {!result.ok ? (
            <>
              <p className="text-red-600">{result.error}</p>
              {result.code === "email_mismatch" ? (
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}&reauth=1&email=${encodeURIComponent(invitation.email)}`}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mit {invitation.email} anmelden
                </Link>
              ) : (
                <Link
                  href="/dashboard?clear_invite=1"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Zum Dashboard
                </Link>
              )}
            </>
          ) : (
            <>
              <p>
                {alreadyMember
                  ? "Ihr Konto ist bereits mit diesem Unternehmen verknüpft."
                  : "Sie wurden erfolgreich hinzugefügt zu"}{" "}
                <strong>{invitation.company_name ?? "Ihrem Team"}</strong>
                {!alreadyMember ? (
                  <>
                    {" "}
                    als <strong>{ROLE_LABELS[invitation.role]}</strong>.
                  </>
                ) : null}
              </p>
              <p className="text-slate-500">
                Angemeldet als <strong>{user.email}</strong>
              </p>
              <Link
                href="/dashboard?clear_invite=1"
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
