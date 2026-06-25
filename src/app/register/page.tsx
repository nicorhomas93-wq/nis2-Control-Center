import { AuthForm } from "@/components/auth/AuthForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  return <AuthForm mode="register" redirectTo={params.redirect} />;
}
