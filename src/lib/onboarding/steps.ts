export const ONBOARDING_STEPS = [
  { key: "company_profile", label: "Unternehmensprofil vervollständigen", href: "/company" },
  { key: "assessment", label: "Betroffenheitscheck durchführen", href: "/assessment" },
  { key: "assets", label: "Zentrale Assets erfassen", href: "/company" },
  { key: "risk_analysis", label: "Erste Risikoanalyse starten", href: "/risks" },
  { key: "responsibles", label: "Verantwortliche Personen festlegen", href: "/settings" },
  { key: "documents", label: "Pflichtdokumente erzeugen", href: "/documents" },
  { key: "measures", label: "Erste Maßnahmen definieren", href: "/measures" },
  { key: "evidence", label: "Nachweise hochladen", href: "/audit" },
  { key: "audit_folder", label: "Audit-Ordner prüfen", href: "/audit" },
  { key: "dashboard_complete", label: "Dashboard freischalten", href: "/dashboard" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];
export type OnboardingStepStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface OnboardingProgressRow {
  id: string;
  company_id: string;
  step_key: OnboardingStepKey;
  status: OnboardingStepStatus;
  completed_by: string | null;
  completed_at: string | null;
  data_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function computeOnboardingPercent(
  rows: OnboardingProgressRow[]
): { percent: number; incomplete: string[] } {
  const total = ONBOARDING_STEPS.length;
  let completed = 0;
  const incomplete: string[] = [];

  for (const step of ONBOARDING_STEPS) {
    const row = rows.find((r) => r.step_key === step.key);
    if (row?.status === "completed") {
      completed += 1;
    } else if (row?.status === "skipped") {
      incomplete.push(step.label);
    }
  }

  return {
    percent: Math.round((completed / total) * 100),
    incomplete,
  };
}
