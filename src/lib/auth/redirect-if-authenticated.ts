import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-seitiger Auth-Check: eingeloggte Nutzer sofort weiterleiten.
 * Für Login-, Register- und Landing-Seiten.
 */
export async function redirectIfAuthenticated(fallback = "/dashboard") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(fallback);
  }
}
