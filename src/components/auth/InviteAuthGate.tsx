import Link from "next/link";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/lib/team/types";
import type { InvitationByToken } from "@/lib/team/invitation-token";

interface InviteAuthGateProps {
  invitation: InvitationByToken;
  token: string;
}

export function InviteAuthGate({ invitation, token }: InviteAuthGateProps) {
  const invitePath = `/invite/${token}`;
  const emailParam = encodeURIComponent(invitation.email);
  const loginHref = `/login?redirect=${encodeURIComponent(invitePath)}&email=${emailParam}`;
  const registerHref = `/register?redirect=${encodeURIComponent(invitePath)}&email=${emailParam}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Shield className="h-8 w-8 text-brand-600" />
            <span className="text-lg font-bold text-slate-900">TKND NIS2 Control Center</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team-Einladung</CardTitle>
            <CardDescription>
              Sie wurden eingeladen, einem Unternehmen beizutreten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p>
                <span className="text-slate-500">Unternehmen:</span>{" "}
                <strong className="text-slate-900">
                  {invitation.company_name ?? "Ihr Team"}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">Rolle:</span>{" "}
                <strong className="text-slate-900">{ROLE_LABELS[invitation.role]}</strong>
              </p>
              <p>
                <span className="text-slate-500">Eingeladen als:</span>{" "}
                <strong className="text-slate-900">{invitation.email}</strong>
              </p>
            </div>

            <p>
              Für <strong>{invitation.email}</strong> existiert noch kein Konto. Wählen Sie{" "}
              <strong>Konto erstellen</strong> — wir legen es direkt an (ohne E-Mail-Bestätigung).
              Haben Sie schon ein Konto? Dann <strong>Anmelden</strong>.
            </p>

            <div className="grid gap-2">
              <Link
                href={loginHref}
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Anmelden
              </Link>
              <Link
                href={registerHref}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Konto erstellen
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
