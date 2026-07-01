"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  key: string;
  label: string;
  href: string;
  status: string;
}

interface OnboardingChecklistProps {
  companyId: string;
}

export function OnboardingChecklist({ companyId }: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [percent, setPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/onboarding?companyId=${companyId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSteps(data.steps ?? []);
      setPercent(data.percent ?? 0);
      setLoading(false);
      if (data.percent >= 100) setDismissed(true);
    })();
  }, [companyId]);

  async function skipStep(stepKey: string) {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, stepKey, status: "skipped" }),
    });
    const res = await fetch(`/api/onboarding?companyId=${companyId}`);
    if (res.ok) {
      const data = await res.json();
      setSteps(data.steps ?? []);
      setPercent(data.percent ?? 0);
    }
  }

  if (loading || dismissed || percent >= 100) return null;

  const nextStep = steps.find((s) => s.status !== "completed" && s.status !== "skipped");

  return (
    <Card className="border-brand-200 bg-brand-50/30">
      <CardHeader>
        <CardTitle>Onboarding</CardTitle>
        <CardDescription>
          Richten Sie Ihr Unternehmen Schritt für Schritt ein ({percent}% abgeschlossen).
        </CardDescription>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {step.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Circle
                  className={cn(
                    "h-4 w-4",
                    step.status === "skipped" ? "text-amber-400" : "text-slate-300"
                  )}
                />
              )}
              <span
                className={cn(
                  step.status === "completed" && "text-slate-500 line-through",
                  step.status === "skipped" && "text-amber-700"
                )}
              >
                {step.label}
              </span>
              {step.status === "skipped" ? (
                <span className="text-xs text-amber-600">(unvollständig)</span>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {nextStep ? (
            <Link
              href={nextStep.href}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Weiter: {nextStep.label}
            </Link>
          ) : null}
          {nextStep ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void skipStep(nextStep.key)}
            >
              Später fortsetzen
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Ausblenden
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
