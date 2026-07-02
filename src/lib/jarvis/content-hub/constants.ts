export const CONTENT_HUB_DISCLAIMER =
  "Content Hub erzeugt Texte und Pläne — kein automatisches Posten auf LinkedIn. Nico prüft und veröffentlicht manuell.";

export type ContentCategory =
  | "problem_based"
  | "audit"
  | "risk"
  | "vendor"
  | "evidence"
  | "training"
  | "incident"
  | "management"
  | "partner"
  | "systemhaus";

export type ContentHubArea =
  | "linkedin_posts"
  | "articles"
  | "polls"
  | "audit_tips"
  | "nis2_myths"
  | "mini_cases"
  | "industry"
  | "campaign_series"
  | "success_stories"
  | "ceo_content";

export type ContentFormat =
  | "short_post"
  | "standard_post"
  | "expert_post"
  | "poll"
  | "story"
  | "customer_problem"
  | "audit_fact"
  | "tip_week"
  | "ceo_perspective"
  | "msp_perspective";

export const CONTENT_CATEGORY_LABELS: Record<ContentCategory, string> = {
  problem_based: "Problembasiert",
  audit: "Audit",
  risk: "Risiko",
  vendor: "Lieferanten",
  evidence: "Nachweise",
  training: "Schulungen",
  incident: "Incident",
  management: "Management",
  partner: "Partner",
  systemhaus: "Systemhaus",
};

export const CONTENT_HUB_AREA_LABELS: Record<ContentHubArea, string> = {
  linkedin_posts: "LinkedIn Beiträge",
  articles: "Fachbeiträge",
  polls: "Umfragen",
  audit_tips: "Audit Tipps",
  nis2_myths: "NIS2 Irrtümer",
  mini_cases: "Mini Cases",
  industry: "Branchenbeiträge",
  campaign_series: "Kampagnenserien",
  success_stories: "Erfolgsstories",
  ceo_content: "Geschäftsführer Content",
};

export const CONTENT_FORMAT_LABELS: Record<ContentFormat, string> = {
  short_post: "Kurzbeitrag (100–150 Wörter)",
  standard_post: "Standard (200–400 Wörter)",
  expert_post: "Fachbeitrag (500+ Wörter)",
  poll: "Umfrage",
  story: "Story Format",
  customer_problem: "Kundenproblem",
  audit_fact: "Audit Fakt",
  tip_week: "Tipp der Woche",
  ceo_perspective: "Geschäftsführer Perspektive",
  msp_perspective: "IT-Dienstleister Perspektive",
};

export const ALLOWED_CTAS = [
  "Wie lösen Sie das aktuell?",
  "Wie handhaben Sie das in Ihrem Unternehmen?",
  "Welche Erfahrungen haben Sie gemacht?",
  "Wäre das bei Ihnen ein Thema?",
  "Interesse an einem kurzen Einblick?",
] as const;

export const CALENDAR_MIX = {
  problem_based: 0.4,
  audit: 0.1,
  evidence: 0.1,
  mini_cases: 0.2,
  polls: 0.1,
  product_insight: 0.1,
} as const;
