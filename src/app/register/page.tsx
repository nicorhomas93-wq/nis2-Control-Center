import { cookies } from "next/headers";
import { AuthForm } from "@/components/auth/AuthForm";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { resolveInviteRedirect, PENDING_INVITE_COOKIE } from "@/lib/auth/invite-cookie";
import { resolveAuthRedirect } from "@/lib/auth/redirect-path";
import { createClient } from "@/lib/supabase/server";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reauth?: string; email?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const pendingInvite = cookieStore.get(PENDING_INVITE_COOKIE)?.value;
  const effectiveRedirect = resolveInviteRedirect(params.redirect, pendingInvite);
  const redirectTo = resolveAuthRedirect(effectiveRedirect);

  if (params.reauth === "1") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } else {
    await redirectIfAuthenticated(redirectTo);
  }

  return (
    <AuthForm
      mode="register"
      redirectTo={effectiveRedirect}
      invitedEmail={params.email}
    />
  );
}
