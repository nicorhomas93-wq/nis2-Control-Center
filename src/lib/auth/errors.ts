type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

export function formatAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) {
    return "Authentifizierung fehlgeschlagen. Bitte erneut versuchen.";
  }

  const message = error.message?.trim();
  const code = error.code?.trim();

  if (code === "user_already_exists" || message === "User already registered") {
    return "Ein Konto mit dieser E-Mail existiert bereits. Bitte melden Sie sich an.";
  }

  if (code === "email_not_confirmed" || message?.toLowerCase().includes("email not confirmed")) {
    return "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse und melden Sie sich dann an.";
  }

  if (message) {
    return message;
  }

  if (code) {
    return `Authentifizierung fehlgeschlagen (${code}).`;
  }

  return "Authentifizierung fehlgeschlagen. Bitte erneut versuchen.";
}
