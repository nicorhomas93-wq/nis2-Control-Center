"use client";

import { createClient } from "@/lib/supabase/client";

export const LOGIN_PATH = "/login";

/** Lokale Browser-Daten nach Abmeldung entfernen. */
export function clearClientAuthStorage(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.warn("localStorage konnte nicht geleert werden:", error);
  }

  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn("sessionStorage konnte nicht geleert werden:", error);
  }
}

/**
 * Beendet die Session vollständig und leitet zur Login-Seite weiter.
 * Nutzt Server-Route (Cookies) + Client signOut + harten Redirect.
 */
export async function performLogout(options?: { redirectTo?: string }): Promise<void> {
  const redirectTo = options?.redirectTo ?? LOGIN_PATH;

  clearClientAuthStorage();

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    console.error("Server-Logout fehlgeschlagen:", error);
  }

  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Client signOut fehlgeschlagen:", error);
  }

  window.location.assign(redirectTo);
}
