import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  return <AuthForm mode="login" redirectTo={params.redirect} />;
}
