export const TRAFFIC_DISCLAIMER =
  "Traffic Jarvis bereitet Recherche, Texte und Abläufe vor. Kein Spam, keine Massenmails, keine LinkedIn-Automation, kein Scraping. Erstkontakt nur manuell. Keine Rechtsberatung.";

export const SEARCH_PLATFORMS = [
  "Google",
  "LinkedIn",
  "Xing",
  "IHK-Verzeichnis",
  "Branchenverzeichnis",
  "Manuelle Recherche",
] as const;

export const OUTREACH_CHANNELS = [
  "email",
  "linkedin",
  "phone",
  "website_contact",
  "follow_up",
] as const;

export const OUTREACH_CHANNEL_LABELS: Record<string, string> = {
  email: "E-Mail",
  linkedin: "LinkedIn (manuell)",
  phone: "Telefon",
  website_contact: "Website-Kontaktformular",
  follow_up: "Follow-up",
};

export const OUTREACH_PURPOSES = [
  "first_contact",
  "pilot_offer",
  "demo_invitation",
  "follow_up",
  "referral_request",
] as const;

export const OUTREACH_PURPOSE_LABELS: Record<string, string> = {
  first_contact: "Erstkontakt",
  pilot_offer: "Pilotangebot",
  demo_invitation: "Demo-Einladung",
  follow_up: "Follow-up",
  referral_request: "Empfehlungsanfrage",
};

export const CONTENT_PLATFORMS = [
  "LinkedIn",
  "Website",
  "Blog",
  "TikTok",
  "YouTube Shorts",
  "Newsletter",
] as const;

export const CONTENT_TYPES = [
  "post",
  "carousel",
  "short_video",
  "article",
  "checklist",
  "case_study",
] as const;

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: "Post",
  carousel: "Karussell",
  short_video: "Kurzvideo",
  article: "Artikel",
  checklist: "Checkliste",
  case_study: "Fallstudie",
};

export const CAMPAIGN_STATUSES = ["planned", "active", "paused", "completed"] as const;

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  planned: "Geplant",
  active: "Aktiv",
  paused: "Pausiert",
  completed: "Abgeschlossen",
};
