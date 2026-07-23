"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  flattenQuestions,
  QUESTIONNAIRES,
  type QuestionnaireArea,
  type QuestionnaireQuestion,
} from "@/lib/compliance/questionnaires";
import { cn } from "@/lib/utils";

interface QuestionnaireClientProps {
  companyId: string;
}

export function QuestionnaireClient({ companyId }: QuestionnaireClientProps) {
  const [activeArea, setActiveArea] = useState<QuestionnaireArea>("backup");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAreas, setSavedAreas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const definition = QUESTIONNAIRES.find((q) => q.areaKey === activeArea)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/questionnaires?companyId=${companyId}`);
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, string> = {};
      const saved = new Set<string>();
      for (const r of data.responses ?? []) {
        saved.add(r.areaKey);
        if (r.areaKey === activeArea) {
          Object.assign(map, r.answers);
        }
      }
      setSavedAreas(saved);
      setAnswers(map);
    } finally {
      setLoading(false);
    }
  }, [companyId, activeArea]);

  useEffect(() => {
    void load();
  }, [load]);

  async function switchArea(area: QuestionnaireArea) {
    setActiveArea(area);
    setFeedback(null);
    const res = await fetch(`/api/questionnaires?companyId=${companyId}&areaKey=${area}`);
    if (res.ok) {
      const data = await res.json();
      const row = (data.responses ?? []).find((r: { areaKey: string }) => r.areaKey === area);
      setAnswers(row?.answers ?? {});
    } else {
      setAnswers({});
    }
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/questionnaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, areaKey: activeArea, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      setSavedAreas((prev) => new Set([...prev, activeArea]));
      const taskMsg =
        data.tasksCreated > 0
          ? ` ${data.tasksCreated} Aufgabe(n) automatisch erstellt.`
          : "";
      setFeedback(`Fragebogen gespeichert.${taskMsg}`);
    } finally {
      setSaving(false);
    }
  }

  const visibleQuestions = flattenQuestions(definition.questions, answers);

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Bereiche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          {QUESTIONNAIRES.map((q) => (
            <button
              key={q.areaKey}
              type="button"
              onClick={() => void switchArea(q.areaKey)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 active:scale-[0.98]",
                activeArea === q.areaKey
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/30"
                  : "text-slate-700 hover:translate-x-0.5 hover:bg-slate-100"
              )}
            >
              <span>{q.title}</span>
              {savedAreas.has(q.areaKey) ? (
                <CheckCircle2
                  className={cn(
                    "h-4 w-4 shrink-0",
                    activeArea === q.areaKey ? "text-white" : "text-emerald-500"
                  )}
                />
              ) : null}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>{definition.title}</CardTitle>
          <CardDescription>
            Strukturierte Angaben statt Freitext — Antworten fließen in Risiken, Aufgaben und
            Audit-Bereitschaft ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {visibleQuestions.map((q) => (
                <QuestionField key={q.id} question={q} value={answers[q.id] ?? ""} onChange={setAnswer} />
              ))}
              {feedback ? (
                <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{feedback}</p>
              ) : null}
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Speichern
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: string;
  onChange: (id: string, value: string) => void;
}) {
  if (question.type === "yes_no_unknown" && question.options) {
    return (
      <fieldset>
        <Label className="mb-2 block font-medium text-slate-900">{question.text}</Label>
        <div className="flex flex-wrap gap-3">
          {question.options.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors",
                value === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              <input
                type="radio"
                name={question.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(question.id, opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div>
      <Label htmlFor={question.id}>{question.text}</Label>
      <Input
        id={question.id}
        value={value}
        onChange={(e) => onChange(question.id, e.target.value)}
        className="mt-1"
      />
    </div>
  );
}
