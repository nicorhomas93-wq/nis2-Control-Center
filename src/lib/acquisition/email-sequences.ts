export {
  STANDARD_NURTURE_DAYS as EMAIL_SEQUENCE_DAYS,
  scheduleDayOffset as scheduleEmailAt,
  getStandardNurtureTemplates,
} from "@/lib/acquisition/follow-up/sequences";
export type { NurtureEmailKey as EmailSequenceDay } from "@/lib/acquisition/follow-up/sequences";

import type { NurtureEmailKey } from "@/lib/acquisition/follow-up/sequences";
import {
  applyPersonalization,
  buildPersonalizationVars,
} from "@/lib/acquisition/follow-up/personalization";
import { getEmailTemplate } from "@/lib/acquisition/follow-up/sequences";
import type { FunnelCheckResult } from "@/lib/funnel/types";

/** @deprecated Use follow-up engine directly */
export function renderSequenceEmail(
  day: number,
  vars: Record<string, string>
): { subject: string; body: string } {
  const keyMap: Record<number, NurtureEmailKey> = {
    0: "day_0",
    1: "day_1",
    3: "day_3",
    5: "day_5",
    7: "day_7",
  };
  const key = keyMap[day] ?? "day_0";
  const template = getEmailTemplate("standard_nurture", key);
  if (!template) throw new Error(`Unknown day: ${day}`);

  const funnelStub = {
    level: "high",
    score: 70,
    label: vars.result_label ?? "Hohe Wahrscheinlichkeit betroffen",
    summary: vars.result_summary ?? "",
    problemFrame: vars.result_summary ?? "",
    answers: { industry: "produktion", companySize: "50-249", criticalInfrastructure: false, itDependency: "hoch" },
    completedAt: new Date().toISOString(),
  } as FunnelCheckResult;

  const pVars = buildPersonalizationVars(funnelStub);
  const merged = { ...pVars, ...vars };

  return {
    subject: applyPersonalization(template.subject, merged),
    body: applyPersonalization(template.body, merged),
  };
}
