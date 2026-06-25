export const LEAD_STATUSES = [
  "new",
  "qualified",
  "contacted",
  "replied",
  "demo_scheduled",
  "proposal_sent",
  "won",
  "lost",
  "not_relevant",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Neu",
  qualified: "Qualifiziert",
  contacted: "Kontaktiert",
  replied: "Antwort erhalten",
  demo_scheduled: "Demo geplant",
  proposal_sent: "Angebot gesendet",
  won: "Gewonnen",
  lost: "Verloren",
  not_relevant: "Nicht relevant",
};

export const CONSENT_STATUSES = [
  "unknown",
  "opt_in",
  "legitimate_interest",
  "no_contact",
] as const;

export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const CONSENT_LABELS: Record<ConsentStatus, string> = {
  unknown: "Unbekannt",
  opt_in: "Opt-in",
  legitimate_interest: "Berechtigtes Interesse",
  no_contact: "Kein Kontakt",
};

export const INTERACTION_TYPES = [
  "email",
  "call",
  "note",
  "demo",
  "proposal",
  "follow_up",
] as const;

export const INTERACTION_STATUSES = [
  "draft",
  "sent",
  "failed",
  "scheduled",
  "completed",
] as const;

export const TASK_PRIORITIES = ["high", "medium", "low"] as const;

export const JARVIS_DISCLAIMER =
  "Jarvis unterstützt bei der Leadbearbeitung. Keine Rechtsberatung. Keine Garantie auf vollständige NIS2-Compliance. Automatische Erstkontakt-Mails nur nach manueller Freigabe.";
