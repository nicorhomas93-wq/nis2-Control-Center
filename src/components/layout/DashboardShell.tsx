import { createClient } from "@/lib/supabase/server";
import { resolveBrandingForUser } from "@/lib/white-label/branding";
import { DEFAULT_BRANDING } from "@/lib/white-label/types";
import { DashboardShellClient } from "@/components/layout/DashboardShellClient";

/**
 * Zentrales App-Layout für alle authentifizierten Bereiche.
 * Lädt White-Label-Branding für Consultant-Pläne serverseitig.
 */
export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const branding = user
    ? await resolveBrandingForUser(user.id, user.email)
    : DEFAULT_BRANDING;

  return <DashboardShellClient branding={branding}>{children}</DashboardShellClient>;
}
