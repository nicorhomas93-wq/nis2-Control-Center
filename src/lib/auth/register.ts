import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAuthError } from "@/lib/auth/errors";

export type AuthNotice = {
  type: "error" | "info";
  message: string;
  suggestLogin?: boolean;
};

async function trySignIn(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

function existingAccountNotice(): AuthNotice {
  return {
    type: "error",
    message:
      "Diese E-Mail ist bereits registriert. Bitte melden Sie sich mit Ihrem Passwort an.",
    suggestLogin: true,
  };
}

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
    const duplicate =
      signUpError.message === "User already registered" ||
      signUpError.code === "user_already_exists";

    if (duplicate && (await trySignIn(supabase, email, options.password))) {
      return { ok: true };
    }

    return {
      ok: false,
      notice: {
        type: "error",
        message: formatAuthError(signUpError),
        suggestLogin: duplicate,
      },
    };
  }

  if (!data.user) {
    if (await trySignIn(supabase, email, options.password)) {
      return { ok: true };
    }

    return {
      ok: false,
      notice: {
        type: "error",
        message:
          "Registrierung konnte nicht abgeschlossen werden. Falls Sie bereits ein Konto haben, melden Sie sich an.",
        suggestLogin: true,
      },
    };
  }

  if (data.user.identities?.length === 0) {
    if (await trySignIn(supabase, email, options.password)) {
      return { ok: true };
    }
    return { ok: false, notice: existingAccountNotice() };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    return { ok: true };
  }

  if (await trySignIn(supabase, email, options.password)) {
    return { ok: true };
  }

  const needsConfirmation = !data.user.email_confirmed_at;

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
    notice: {
      type: "error",
      message:
        "Registrierung abgeschlossen, aber Anmeldung fehlgeschlagen. Bitte melden Sie sich manuell an.",
      suggestLogin: true,
    },
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
