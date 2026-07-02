export const LINKEDIN_CAMPAIGN_DISCLAIMER =
  "Kein automatischer Erstkontakt über LinkedIn. Nach der ersten Antwort automatisiert Jarvis intern Klassifizierung, Aufgaben und Antwortvorschläge — Versand bleibt manuell durch Nico.";

export type LinkedInCampaignStatus = "draft" | "active" | "paused" | "ended";

export type LinkedInCampaignLeadStatus =
  | "new"
  | "researched"
  | "message_prepared"
  | "contacted"
  | "replied"
  | "demo_scheduled"
  | "demo_done"
  | "quote_requested"
  | "won"
  | "lost"
  | "follow_up_later"
  | "management_review";

export type LinkedInResponseType =
  | "interest"
  | "info_requested"
  | "demo_requested"
  | "internal_forward"
  | "pricing_question"
  | "technical_question"
  | "security_question"
  | "management_review"
  | "purchase_intent"
  | "wrong_contact"
  | "no_interest"
  | "contact_later"
  | "unclear";

export type ResponseChannel = "linkedin" | "email" | "phone" | "whatsapp" | "other";

export type LinkedInDemoStatus =
  | "planned"
  | "completed"
  | "offer_follows"
  | "pilot"
  | "won"
  | "lost";

export type LinkedInReminderType =
  | "response_pending"
  | "demo_open"
  | "follow_up_7d"
  | "offer_open"
  | "pilot_running";

export const CAMPAIGN_STATUS_LABELS: Record<LinkedInCampaignStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  paused: "Pausiert",
  ended: "Beendet",
};

export const LEAD_STATUS_LABELS: Record<LinkedInCampaignLeadStatus, string> = {
  new: "Neu",
  researched: "Recherchiert",
  message_prepared: "Nachricht vorbereitet",
  contacted: "Kontaktiert",
  replied: "Antwort erhalten",
  demo_scheduled: "Demo vereinbart",
  demo_done: "Demo durchgeführt",
  quote_requested: "Angebot angefragt",
  won: "Gewonnen",
  lost: "Verloren",
  follow_up_later: "Später erneut ansprechen",
  management_review: "Geschäftsführung prüft",
};

export const RESPONSE_TYPE_LABELS: Record<LinkedInResponseType, string> = {
  interest: "Interesse",
  info_requested: "Bitte Infos senden",
  demo_requested: "Demo gewünscht",
  internal_forward: "Weiterleitung intern",
  pricing_question: "Preisfrage",
  technical_question: "Technische Frage",
  security_question: "Datenschutz-/Security-Frage",
  management_review: "Geschäftsführung prüft",
  purchase_intent: "Kaufinteresse / Angebot",
  wrong_contact: "Falscher Ansprechpartner",
  no_interest: "Kein Interesse",
  contact_later: "Später melden",
  unclear: "Unklare Antwort",
};

export const RESPONSE_CHANNEL_LABELS: Record<ResponseChannel, string> = {
  linkedin: "LinkedIn",
  email: "E-Mail",
  phone: "Telefon",
  whatsapp: "WhatsApp",
  other: "Sonstiges",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  done: "Erledigt",
  cancelled: "Abgebrochen",
};

export const DEMO_STATUS_LABELS: Record<LinkedInDemoStatus, string> = {
  planned: "Geplant",
  completed: "Durchgeführt",
  offer_follows: "Angebot folgt",
  pilot: "Pilotphase",
  won: "Gewonnen",
  lost: "Verloren",
};

export const REMINDER_TYPE_LABELS: Record<LinkedInReminderType, string> = {
  response_pending: "Antwort offen",
  demo_open: "Demo offen",
  follow_up_7d: "Nachfassen in 7 Tagen",
  offer_open: "Angebot offen",
  pilot_running: "Pilotphase läuft",
};

export const ACTIVE_CAMPAIGN_STATUSES: LinkedInCampaignStatus[] = ["draft", "active", "paused"];
export const ENDED_CAMPAIGN_STATUSES: LinkedInCampaignStatus[] = ["ended"];

export const WON_LEAD_STATUSES: LinkedInCampaignLeadStatus[] = ["won"];
export const LOST_LEAD_STATUSES: LinkedInCampaignLeadStatus[] = ["lost"];
