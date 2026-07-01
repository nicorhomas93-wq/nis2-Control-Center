export type AutomationTriggerType = "high_risk" | "document_reminder" | "audit_progress";

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  high_risk: "Hoher Handlungsbedarf",
  document_reminder: "Dokument-Erinnerung",
  audit_progress: "Fortschritts-Reminder",
};

/** Cooldown in Tagen pro Trigger */
export const TRIGGER_COOLDOWN_DAYS: Record<AutomationTriggerType, number> = {
  high_risk: 7,
  document_reminder: 3,
  audit_progress: 7,
};

export interface CustomerProfileState {
  riskScore: number;
  documentMissing: boolean;
  auditIncomplete: boolean;
}

export function buildTriggerMessage(
  trigger: AutomationTriggerType,
  companyName: string,
  profile: CustomerProfileState
): { subject: string; body: string } {
  switch (trigger) {
    case "high_risk":
      return {
        subject: `Hoher Handlungsbedarf — ${companyName}`,
        body: `Hallo,\n\nfür ${companyName} liegt ein erhöhter Handlungsbedarf vor (Risiko-Score: ${profile.riskScore}/100). Bitte priorisieren Sie die nächsten NIS2-Schritte.\n\nViele Grüße\nIhr TKND-Team`,
      };
    case "document_reminder":
      return {
        subject: `Erinnerung: fehlende Unterlagen — ${companyName}`,
        body: `Hallo,\n\nfür ${companyName} fehlen noch wichtige Unterlagen im NIS2-Ordner. Bitte ergänzen Sie die offenen Dokumente.\n\nViele Grüße\nIhr TKND-Team`,
      };
    case "audit_progress":
      return {
        subject: `Audit-Fortschritt — ${companyName}`,
        body: `Hallo,\n\nder Audit-Ordner für ${companyName} ist noch nicht vollständig. Bitte schließen Sie die offenen Bereiche ab.\n\nViele Grüße\nIhr TKND-Team`,
      };
  }
}

export function activeTriggers(profile: CustomerProfileState): AutomationTriggerType[] {
  const triggers: AutomationTriggerType[] = [];
  if (profile.riskScore > 80) triggers.push("high_risk");
  if (profile.documentMissing) triggers.push("document_reminder");
  if (profile.auditIncomplete) triggers.push("audit_progress");
  return triggers;
}
