export const LINKEDIN_PUBLISHING_DISCLAIMER =
  "LinkedIn Publishing bereitet Beiträge vor und veröffentlicht nur auf expliziten Klick — keine automatischen Nachrichten, keine Kontaktanfragen, kein Auto-Posting.";

export type LinkedInPostType =
  | "expert_article"
  | "short_post"
  | "poll"
  | "tip"
  | "case_study"
  | "audit_tip"
  | "nis2_topic"
  | "vendor"
  | "training_evidence";

export type LinkedInPublishStatus = "draft" | "scheduled" | "published" | "failed";

export const LINKEDIN_POST_TYPE_LABELS: Record<LinkedInPostType, string> = {
  expert_article: "Fachbeitrag",
  short_post: "Kurzer Beitrag",
  poll: "Umfrage",
  tip: "Tipp",
  case_study: "Case Study",
  audit_tip: "Audit Tipp",
  nis2_topic: "NIS2 Thema",
  vendor: "Lieferantenbewertung",
  training_evidence: "Schulungen & Nachweise",
};

export const LINKEDIN_PUBLISH_STATUS_LABELS: Record<LinkedInPublishStatus, string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  published: "Veröffentlicht",
  failed: "Fehlgeschlagen",
};

export const TARGET_AUDIENCE_OPTIONS = [
  "IT-Leitung",
  "Geschäftsführung",
  "Compliance / ISB",
  "Systemhäuser & MSP",
  "Alle Follower",
] as const;

export const ALLOWED_PUBLISH_CTAS = [
  "Wie lösen Sie das aktuell?",
  "Wie handhaben Sie das in Ihrem Unternehmen?",
  "Welche Erfahrungen haben Sie gemacht?",
  "Wäre das bei Ihnen ein Thema?",
  "Interesse an einem kurzen Einblick?",
] as const;

export const LINKEDIN_OAUTH_SCOPES = ["openid", "profile", "email", "w_member_social"] as const;
