import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAuthError } from "@/lib/auth/errors";

export type AuthNotice =
  | { type: "error"; message: string }
  | { type: "info"; message: string };

export async function registerAccount(
  supabase: SupabaseClient,
  options: {
    email: string;
    password: string;
    redirectPath: string;
  }
): Promise<{ ok: true } | { ok: false; notice: AuthNotice }> {
  const email = options.email.trim().toLowerCase();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password: options.password,
    options: {
      emailRedirectTo: origin ? `${origin}${options.redirectPath}` : undefined,
    },
  });

  if (signUpError) {
    return {
      ok: false,
      notice: { type: "error", message: formatAuthError(signUpError) },
    };
  }

  if (data.user?.identities?.length === 0) {
    return {
      ok: false,
      notice: {
        type: "error",
        message: "Ein Konto mit dieser E-Mail existiert bereits. Bitte melden Sie sich an.",
      },
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    return { ok: true };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: options.password,
  });

  if (!signInError) {
    return { ok: true };
  }

  const needsConfirmation =
    !data.user?.email_confirmed_at ||
    signInError.message?.toLowerCase().includes("email not confirmed") ||
    signInError.code === "email_not_confirmed";

  if (needsConfirmation) {
    return {
      ok: false,
      notice: {
        type: "info",
        message:
          "Konto erstellt. Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link in Ihrem Postfach. Danach können Sie sich anmelden und die Einladung annehmen.",
      },
    };
  }

  return {
    ok: false,
    notice: { type: "error", message: formatAuthError(signInError) },
  };
}

export async function loginAccount(
  supabase: SupabaseClient,
  options: { email: string; password: string }
): Promise<{ ok: true } | { ok: false; notice: AuthNotice }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: options.email.trim().toLowerCase(),
    password: options.password,
  });

  if (error) {
    return {
      ok: false,
      notice: { type: "error", message: formatAuthError(error) },
    };
  }

  return { ok: true };
}
