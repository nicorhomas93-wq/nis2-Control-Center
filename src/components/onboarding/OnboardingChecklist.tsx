"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  key: string;
  label: string;
  href: string;
  status: string;
  autoCompleted?: boolean;
}

interface OnboardingChecklistProps {
  companyId: string;
}

export function OnboardingChecklist({ companyId }: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [percent, setPercent] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/onboarding?companyId=${companyId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSteps(data.steps ?? []);
      setPercent(data.percent ?? 0);
      setIsComplete(Boolean(data.isComplete));
      if (data.percent < 100) setExpanded(true);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function skipStep(stepKey: string) {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, stepKey, status: "skipped" }),
    });
    void load();
  }

  if (loading) {
    return (
      <Card className="border-brand-200 bg-brand-50/30">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (isComplete && !expanded) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-900">
              Ihr Unternehmen wurde erfolgreich eingerichtet.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
            Onboarding erneut anzeigen
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nextStep = steps.find((s) => s.status !== "completed" && s.status !== "skipped");

  return (
    <Card className={cn("border-brand-200 bg-brand-50/30", isComplete && "border-emerald-200 bg-emerald-50/30")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>
              {isComplete
                ? "Alle Einrichtungsschritte abgeschlossen."
                : `Richten Sie Ihr Unternehmen Schritt für Schritt ein (${percent}% abgeschlossen).`}
            </CardDescription>
          </div>
          {isComplete ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              <ChevronUp className="h-4 w-4" />
              Einklappen
            </Button>
          ) : null}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isComplete ? "bg-emerald-500" : "bg-brand-600"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">{percent}% — {steps.filter((s) => s.status === "completed").length} von 10 Schritten</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {step.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle
                  className={cn(
                    "h-4 w-4 shrink-0",
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
              ) : step.autoCompleted && step.status === "completed" ? (
                <span className="text-xs text-emerald-600">(automatisch)</span>
              ) : null}
            </li>
          ))}
        </ul>
        {!isComplete ? (
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
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(false)}>
            <ChevronDown className="h-4 w-4" />
            Einklappen
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
