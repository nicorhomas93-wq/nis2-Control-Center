const FALLBACK =
  "Authentifizierung fehlgeschlagen. Bitte erneut versuchen oder sich anmelden.";

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function formatAuthError(error: unknown): string {
  if (!error) {
    return FALLBACK;
  }

  if (typeof error === "string") {
    return error.trim() || FALLBACK;
  }

  if (typeof error !== "object") {
    return FALLBACK;
  }

  const record = error as Record<string, unknown>;
  const message = pickString(record.message, record.msg, record.error_description, record.error);
  const code = pickString(record.code);
  const status = typeof record.status === "number" ? String(record.status) : null;

  if (code === "user_already_exists" || message === "User already registered") {
    return "Ein Konto mit dieser E-Mail existiert bereits. Bitte melden Sie sich an.";
  }

  if (
    code === "email_not_confirmed" ||
    message?.toLowerCase().includes("email not confirmed")
  ) {
    return "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse und melden Sie sich dann an.";
  }

  if (code === "invalid_credentials" || message?.toLowerCase().includes("invalid login")) {
    return "E-Mail oder Passwort ist falsch. Falls Sie bereits ein Konto haben, melden Sie sich an.";
  }

  if (message) {
    return message;
  }

  if (code) {
    return `Authentifizierung fehlgeschlagen (${code}).`;
  }

  if (status) {
    return `Authentifizierung fehlgeschlagen (HTTP ${status}).`;
  }

  return FALLBACK;
}

export function resolveNoticeMessage(notice: { type: "error" | "info"; message?: string }): string {
  const text = notice.message?.trim();
  if (text) return text;

  return notice.type === "error"
    ? "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut oder melden Sie sich an."
    : "Bitte prüfen Sie Ihre E-Mails und bestätigen Sie Ihre Adresse.";
}
