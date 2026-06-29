"use client";

import { useRouter } from "next/navigation";
import { Building2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ActiveMandantBannerProps {
  companyName: string | null;
}

export function ActiveMandantBanner({ companyName }: ActiveMandantBannerProps) {
  const router = useRouter();

  async function clearMandant() {
    await fetch("/api/consultant/select-mandant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: null }),
    });
    router.refresh();
  }

  return (
    <div className="mb-6 flex gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 flex-row items-center justify-between">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 shrink-0 text-brand-600" />
        <div>
          <p className="text-sm font-medium text-brand-900">Aktiver Mandant</p>
          <p className="text-sm text-brand-700">{companyName ?? "Unbenannt"}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={clearMandant}>
        <X className="h-4 w-4" />
        Mandantenansicht beenden
      </Button>
    </div>
  );
}
