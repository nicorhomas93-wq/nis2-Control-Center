"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginAccount, registerAccount, type AuthNotice } from "@/lib/auth/register";
import { resolveNoticeMessage } from "@/lib/auth/errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { resolveAuthRedirect } from "@/lib/auth/redirect-path";

interface AuthFormProps {
  mode: "login" | "register";
  redirectTo?: string;
  invitedEmail?: string;
}

export function AuthForm({ mode, redirectTo, invitedEmail }: AuthFormProps) {
  const [email, setEmail] = useState(invitedEmail ?? "");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const targetPath = resolveAuthRedirect(redirectTo);
  const isInviteFlow = Boolean(redirectTo?.startsWith("/invite/"));
  const authSwitchHref =
    mode === "login"
      ? redirectTo
        ? `/register?redirect=${encodeURIComponent(redirectTo)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""}`
        : "/register"
      : redirectTo
        ? `/login?redirect=${encodeURIComponent(redirectTo)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""}`
        : "/login";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.assign(targetPath);
        return;
      }
      setCheckingSession(false);
    });
  }, [targetPath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setLoading(true);

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();

    if (isInviteFlow && invitedEmail && normalizedEmail !== invitedEmail.trim().toLowerCase()) {
      setNotice({
        type: "error",
        message: `Bitte registrieren Sie sich mit der eingeladenen Adresse: ${invitedEmail}`,
      });
      setLoading(false);
      return;
    }

    const result =
      mode === "login"
        ? await loginAccount(supabase, { email: normalizedEmail, password })
        : await registerAccount(supabase, {
            email: normalizedEmail,
            password,
            redirectPath: targetPath,
          });

    if (!result.ok) {
      setNotice(result.notice);
      setLoading(false);
      return;
    }

    await supabase.auth.getSession();
    window.location.assign(targetPath);
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500">Sitzung wird geprüft…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Shield className="h-8 w-8 text-brand-600" />
            <span className="text-lg font-bold text-slate-900">
              TKND NIS2 Control Center
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "login" ? "Anmelden" : "Konto erstellen"}
            </CardTitle>
            <CardDescription>
              {isInviteFlow
                ? mode === "register"
                  ? "Erstellen Sie ein Konto mit der eingeladenen E-Mail-Adresse, um die Einladung anzunehmen."
                  : "Melden Sie sich mit der eingeladenen E-Mail-Adresse an, um die Einladung anzunehmen."
                : mode === "login"
                  ? "Melden Sie sich an, um auf Ihr Compliance-Dashboard zuzugreifen."
                  : "Erstellen Sie ein Konto und starten Sie Ihren NIS2-Check."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@unternehmen.de"
                  readOnly={Boolean(invitedEmail)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  minLength={6}
                  required
                />
              </div>

              {notice ? (
                <div
                  className={`space-y-2 rounded-lg px-3 py-2 text-sm ${
                    notice.type === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-blue-50 text-blue-800"
                  }`}
                >
                  <p>{resolveNoticeMessage(notice)}</p>
                  {notice.suggestLogin ? (
                    <Link
                      href={authSwitchHref}
                      className="inline-flex font-medium underline underline-offset-2"
                    >
                      Jetzt anmelden
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Wird verarbeitet..."
                  : mode === "login"
                    ? "Anmelden"
                    : "Registrieren"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              {mode === "login" ? (
                <>
                  Noch kein Konto?{" "}
                  <Link href={authSwitchHref} className="font-medium text-brand-600 hover:underline">
                    Registrieren
                  </Link>
                </>
              ) : (
                <>
                  Bereits registriert?{" "}
                  <Link href={authSwitchHref} className="font-medium text-brand-600 hover:underline">
                    Anmelden
                  </Link>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
