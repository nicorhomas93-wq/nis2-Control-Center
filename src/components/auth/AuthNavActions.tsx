"use client";

import Link from "next/link";
import { LayoutDashboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthSession } from "@/hooks/useAuthSession";
import { cn } from "@/lib/utils";

interface AuthNavActionsProps {
  className?: string;
}

/**
 * Navbar-Aktionen: Login (Gast) oder Dashboard (eingeloggt).
 * Mobile-first — immer sichtbar, kein overflow-hidden.
 */
export function AuthNavActions({ className }: AuthNavActionsProps) {
  const { isAuthenticated, loading } = useAuthSession();

  if (loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn("shrink-0 whitespace-nowrap opacity-60", className)}
        aria-hidden
      >
        …
      </Button>
    );
  }

  if (isAuthenticated) {
    return (
      <Link href="/dashboard" className={cn("shrink-0", className)}>
        <Button variant="outline" size="sm" className="whitespace-nowrap">
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Dashboard
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/login" className={cn("shrink-0", className)}>
      <Button variant="ghost" size="sm" className="whitespace-nowrap">
        <LogIn className="h-4 w-4 shrink-0" />
        Anmelden
      </Button>
    </Link>
  );
}
