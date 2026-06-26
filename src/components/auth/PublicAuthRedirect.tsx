"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";

interface PublicAuthRedirectProps {
  redirectTo?: string;
}

/**
 * Client-Fallback: eingeloggte Nutzer von öffentlichen Seiten nach /dashboard leiten.
 * Server/Middleware übernimmt den primären Redirect; dies deckt Client-Navigation ab.
 */
export function PublicAuthRedirect({ redirectTo = "/dashboard" }: PublicAuthRedirectProps) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthSession();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const target =
        redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/dashboard";
      router.replace(target);
    }
  }, [isAuthenticated, loading, redirectTo, router]);

  return null;
}
