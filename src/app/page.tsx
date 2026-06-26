import { LandingPageClient } from "@/components/marketing/LandingPageClient";
import { PublicAuthRedirect } from "@/components/auth/PublicAuthRedirect";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";

export default async function LandingPage() {
  await redirectIfAuthenticated("/dashboard");
  return (
    <>
      <PublicAuthRedirect redirectTo="/dashboard" />
      <LandingPageClient />
    </>
  );
}
