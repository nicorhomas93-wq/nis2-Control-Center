import { AuthForm } from "@/components/auth/AuthForm";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { resolveAuthRedirect } from "@/lib/auth/redirect-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = resolveAuthRedirect(params.redirect);
  await redirectIfAuthenticated(redirectTo);
  return <AuthForm mode="login" redirectTo={params.redirect} />;
}
