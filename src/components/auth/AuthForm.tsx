"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

interface AuthFormProps {
  mode: "login" | "register";
  redirectTo?: string;
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: authError } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    router.refresh();
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
              {mode === "login"
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

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

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
                  <Link href="/register" className="font-medium text-brand-600 hover:underline">
                    Registrieren
                  </Link>
                </>
              ) : (
                <>
                  Bereits registriert?{" "}
                  <Link href="/login" className="font-medium text-brand-600 hover:underline">
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
