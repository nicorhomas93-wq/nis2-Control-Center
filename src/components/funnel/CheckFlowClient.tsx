"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FunnelLayout } from "@/components/funnel/FunnelLayout";
import { Button } from "@/components/ui/Button";
import { scoreFunnelCheck } from "@/lib/funnel/scoring";
import { saveFunnelResult } from "@/lib/funnel/storage";
import { submitCheckComplete, trackAcquisition } from "@/lib/acquisition/client";
import type { CompanySize, FunnelCheckAnswers, Industry, ItDependency } from "@/lib/funnel/types";

const TOTAL_STEPS = 4;

const sizeOptions: { value: CompanySize; label: string }[] = [
  { value: "1-49", label: "1–49 Mitarbeitende" },
  { value: "50-249", label: "50–249 Mitarbeitende" },
  { value: "250+", label: "250+ Mitarbeitende" },
];

const industryOptions: { value: Industry; label: string }[] = [
  { value: "produktion", label: "Produktion / Fertigung" },
  { value: "handel", label: "Handel" },
  { value: "dienstleistung", label: "Dienstleistung" },
  { value: "gesundheit", label: "Gesundheit / Pflege" },
  { value: "energie", label: "Energie / Versorgung" },
  { value: "it", label: "IT / Software" },
  { value: "sonstige", label: "Sonstige" },
];

const itOptions: { value: ItDependency; label: string }[] = [
  { value: "hoch", label: "Hoch — Betrieb ohne IT nicht möglich" },
  { value: "mittel", label: "Mittel — wichtige Prozesse digital" },
  { value: "niedrig", label: "Niedrig — überwiegend analog" },
];

function OptionCard({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
        selected
          ? "border-brand-500 bg-brand-50 font-medium text-brand-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

export function CheckFlowClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Partial<FunnelCheckAnswers>>({});

  useEffect(() => {
    void trackAcquisition("check_started", { pagePath: "/check" });
  }, []);

  async function submit() {
    const complete = answers as FunnelCheckAnswers;
    const result = scoreFunnelCheck(complete);
    saveFunnelResult(result);
    void submitCheckComplete(result as unknown as Record<string, unknown>);
    router.push("/result");
  }

  const canContinue =
    (step === 1 && answers.companySize) ||
    (step === 2 && answers.industry) ||
    (step === 3 && answers.criticalInfrastructure !== undefined) ||
    (step === 4 && answers.itDependency);

  return (
    <FunnelLayout step={step} totalSteps={TOTAL_STEPS} showProgress>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">NIS2-Schnellcheck</h1>
        <p className="mt-2 text-slate-600">4 Fragen — Ergebnis in unter 2 Minuten.</p>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Wie groß ist Ihr Unternehmen?</h2>
          {sizeOptions.map((o) => (
            <OptionCard
              key={o.value}
              selected={answers.companySize === o.value}
              label={o.label}
              onClick={() => {
                setAnswers((a) => ({ ...a, companySize: o.value }));
                setStep(2);
              }}
            />
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">In welcher Branche sind Sie tätig?</h2>
          {industryOptions.map((o) => (
            <OptionCard
              key={o.value}
              selected={answers.industry === o.value}
              label={o.label}
              onClick={() => {
                setAnswers((a) => ({ ...a, industry: o.value }));
                setStep(3);
              }}
            />
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Sind Sie Teil kritischer Infrastruktur oder liefern Sie an solche Unternehmen?
          </h2>
          <OptionCard
            selected={answers.criticalInfrastructure === true}
            label="Ja"
            onClick={() => {
              setAnswers((a) => ({ ...a, criticalInfrastructure: true }));
              setStep(4);
            }}
          />
          <OptionCard
            selected={answers.criticalInfrastructure === false}
            label="Nein"
            onClick={() => {
              setAnswers((a) => ({ ...a, criticalInfrastructure: false }));
              setStep(4);
            }}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Wie hoch ist Ihre Abhängigkeit von IT-Systemen?
          </h2>
          {itOptions.map((o) => (
            <OptionCard
              key={o.value}
              selected={answers.itDependency === o.value}
              label={o.label}
              onClick={() => setAnswers((a) => ({ ...a, itDependency: o.value }))}
            />
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
        ) : (
          <div />
        )}
        {step < TOTAL_STEPS ? (
          <Button type="button" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
            Weiter
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" disabled={!canContinue} onClick={submit} size="lg">
            Jetzt prüfen
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </FunnelLayout>
  );
}
