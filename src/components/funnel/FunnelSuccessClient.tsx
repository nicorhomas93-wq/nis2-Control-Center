"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { FunnelLayout } from "@/components/funnel/FunnelLayout";
import { Button } from "@/components/ui/Button";

export function FunnelSuccessClient() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard?funnel=1"), 4000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <FunnelLayout>
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Setup abgeschlossen</h1>
        <p className="mt-3 text-slate-600">
          Ihr Zugang ist aktiv. Sie werden in Kürze zum Dashboard weitergeleitet.
        </p>
        <Link href="/dashboard?funnel=1" className="mt-8 block">
          <Button size="lg" className="w-full">
            Jetzt starten
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </FunnelLayout>
  );
}
