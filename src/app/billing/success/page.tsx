import Link from "next/link";
import { CheckCircle2, ArrowRight, CreditCard } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/billing/success");

  const params = await searchParams;
  const sessionId = params.session_id;

  return (
    <DashboardShell>
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">Zahlung erfolgreich</CardTitle>
          <CardDescription>
            Ihr Abo wird aktiviert. Die Bestätigung kann einige Sekunden dauern.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/dashboard">
            <Button className="w-full">
              Zum Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="w-full">
              <CreditCard className="h-4 w-4" />
              Billing öffnen
            </Button>
          </Link>
          {process.env.NODE_ENV === "development" && sessionId && (
            <p className="mt-2 text-center font-mono text-xs text-slate-400">
              session_id: {sessionId}
            </p>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
