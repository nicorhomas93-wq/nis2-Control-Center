import { AuthForm } from "@/components/auth/AuthForm";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { resolveAuthRedirect } from "@/lib/auth/redirect-path";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reauth?: string; error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = resolveAuthRedirect(params.redirect);

  if (params.reauth === "1") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } else {
    await redirectIfAuthenticated(redirectTo);
  }

  return <AuthForm mode="login" redirectTo={params.redirect} invitedEmail={params.email} />;
}
