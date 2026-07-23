"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginAccount, registerAccount, type AuthNotice } from "@/lib/auth/register";
import { formatAuthError, resolveNoticeMessage } from "@/lib/auth/errors";
import { AuthGlowButton } from "@/components/auth/AuthGlowButton";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { resolveAuthRedirect } from "@/lib/auth/redirect-path";

async function registerInviteViaServer(options: {
  token: string;
  email: string;
  password: string;
  supabase: ReturnType<typeof createClient>;
  targetPath: string;
}): Promise<{ ok: true } | { ok: false; notice: AuthNotice }> {
  const res = await fetch("/api/auth/register-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: options.token,
      email: options.email,
      password: options.password,
    }),
  });

  const data = (await res.json()) as {
    error?: string;
    suggestLogin?: boolean;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      notice: {
        type: "error",
        message: data.error ?? "Registrierung fehlgeschlagen.",
        suggestLogin: data.suggestLogin,
      },
    };
  }

  const login = await loginAccount(options.supabase, {
    email: options.email,
    password: options.password,
  });

  if (!login.ok) {
    return {
      ok: false,
      notice: {
        type: "info",
        message:
          data.message ??
          "Konto wurde angelegt. Bitte melden Sie sich jetzt an, um die Einladung anzunehmen.",
        suggestLogin: true,
      },
    };
  }

  return { ok: true };
}

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
  const inviteToken = isInviteFlow ? redirectTo!.slice("/invite/".length) : null;
  const authSwitchHref =
    mode === "login"
      ? redirectTo
        ? `/register?redirect=${encodeURIComponent(redirectTo)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""}`
        : "/register"
      : redirectTo
        ? `/login?redirect=${encodeURIComponent(redirectTo)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""}`
        : "/login";

  useEffect(() => {
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail]);

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
        : isInviteFlow && inviteToken
          ? await registerInviteViaServer({
              token: inviteToken,
              email: normalizedEmail,
              password,
              supabase,
              targetPath,
            })
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

  async function handlePasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setNotice({ type: "error", message: "Bitte geben Sie zuerst Ihre E-Mail-Adresse ein." });
      return;
    }

    setLoading(true);
    setNotice(null);
    const supabase = createClient();
    const redirectQuery = redirectTo
      ? `?redirect=${encodeURIComponent(redirectTo)}&email=${encodeURIComponent(normalizedEmail)}`
      : "";
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/login${redirectQuery}`,
    });
    setLoading(false);

    if (error) {
      setNotice({ type: "error", message: formatAuthError(error) });
      return;
    }

    setNotice({
      type: "info",
      message:
        "Wir haben Ihnen einen Link zum Zurücksetzen des Passworts gesendet. Bitte prüfen Sie Ihr Postfach.",
    });
  }

  async function handleResendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setNotice({ type: "error", message: "Bitte geben Sie zuerst Ihre E-Mail-Adresse ein." });
      return;
    }

    setLoading(true);
    setNotice(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}${targetPath}`,
      },
    });
    setLoading(false);

    if (error) {
      setNotice({ type: "error", message: formatAuthError(error) });
      return;
    }

    setNotice({
      type: "info",
      message:
        "Bestätigungs-E-Mail wurde erneut gesendet. Bitte klicken Sie den Link in der E-Mail, bevor Sie sich anmelden.",
    });
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
                  placeholder="Mindestens 8 Zeichen empfohlen"
                  minLength={8}
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

              <AuthGlowButton loading={loading} disabled={loading}>
                {loading
                  ? "Wird verarbeitet..."
                  : mode === "login"
                    ? "Anmelden"
                    : "Registrieren"}
              </AuthGlowButton>

              {mode === "login" ? (
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    className="text-left text-sm text-brand-600 hover:underline disabled:opacity-50"
                    onClick={() => void handlePasswordReset()}
                    disabled={loading}
                  >
                    Passwort vergessen?
                  </button>
                  {isInviteFlow ? (
                    <button
                      type="button"
                      className="text-left text-sm text-brand-600 hover:underline disabled:opacity-50"
                      onClick={() => void handleResendConfirmation()}
                      disabled={loading}
                    >
                      Bestätigungs-E-Mail erneut senden
                    </button>
                  ) : null}
                </div>
              ) : null}
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
