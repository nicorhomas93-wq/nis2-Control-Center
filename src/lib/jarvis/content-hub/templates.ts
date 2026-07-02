import type { ContentCategory, ContentFormat, ContentHubArea } from "@/lib/jarvis/content-hub/constants";

export interface GeneratedPost {
  title: string;
  category: ContentCategory;
  hub_area: ContentHubArea;
  format: ContentFormat;
  hook: string | null;
  body: string;
  call_to_action: string;
  poll_question?: string | null;
  poll_options?: string[];
  word_count: number;
  tags: string[];
}

export interface ContentSeriesDefinition {
  slug: string;
  name: string;
  category: ContentCategory;
  hub_area: ContentHubArea;
  description: string;
  days: Array<{ day: number; title: string; category: ContentCategory; topic: string }>;
}

export const SEED_POST_BODIES: Array<{
  title: string;
  category: ContentCategory;
  hub_area: ContentHubArea;
  body: string;
  hook?: string;
  cta?: string;
}> = [
  {
    title: "Nachweise fehlen im Audit",
    category: "evidence",
    hub_area: "linkedin_posts",
    hook: "Maßnahmen dokumentiert — aber wo sind die Nachweise?",
    body: `Viele Unternehmen haben Maßnahmen dokumentiert.

Aber wenn morgen ein Auditor fragt:

„Wo sind die Nachweise?"

Dann beginnt häufig die Suche.

In Ordnern. In E-Mails. In Excel-Listen.

Genau deshalb haben wir ein zentrales Nachweiscenter aufgebaut — Schulungen, Phishing-Auswertungen, Lieferantenbewertungen und Audit-Exporte an einem Ort.`,
    cta: "Wie lösen Sie das aktuell?",
  },
  {
    title: "NIS2 ist oft ein Nachweisproblem",
    category: "problem_based",
    hub_area: "linkedin_posts",
    body: `Die größte Herausforderung bei NIS2 ist oft nicht das Risiko.

Sondern der Nachweis, dass etwas gemacht wurde.

Risiken kann man beschreiben.
Maßnahmen kann man planen.

Aber ohne Nachweis bleibt im Audit die Frage: Wurde es wirklich umgesetzt?`,
    cta: "Welche Erfahrungen haben Sie gemacht?",
  },
  {
    title: "Schulungsnachweise in 10 Minuten?",
    category: "training",
    hub_area: "audit_tips",
    body: `Werden Ihre Schulungsnachweise in 10 Minuten gefunden?

Oder dauert die Suche länger als die Schulung selbst?

MFA-Einführung, Phishing-Simulation, Awareness — oft vorhanden, selten zentral abgelegt.`,
    cta: "Wie handhaben Sie das in Ihrem Unternehmen?",
  },
  {
    title: "M365 dokumentiert?",
    category: "evidence",
    hub_area: "nis2_myths",
    body: `Microsoft 365 eingeführt?
MFA aktiviert?
Perfekt.

Aber ist das auch dokumentiert?

Technik allein reicht im Audit selten. Entscheidend ist oft: Wer hat wann was entschieden — und wo liegt der Nachweis?`,
    cta: "Wäre das bei Ihnen ein Thema?",
  },
  {
    title: "Lieferantenrisiko beginnt früher",
    category: "vendor",
    hub_area: "linkedin_posts",
    body: `Lieferantenrisiken beginnen nicht erst beim Ausfall.

Sie beginnen oft bei fehlender Dokumentation.

Welche Lieferanten sind kritisch?
Wurde die Bewertung nachvollziehbar festgehalten?
Gibt es einen Nachweis für die letzte Prüfung?`,
    cta: "Wie lösen Sie das aktuell?",
  },
  {
    title: "Audit-Chaos aus vier Tools",
    category: "problem_based",
    hub_area: "linkedin_posts",
    body: `Viele Unternehmen verwalten für Audits:

- Excel
- PDFs
- Outlook
- Teams

Die Frage ist nicht ob Informationen existieren.

Die Frage ist:

Wie lange dauert es, alles zusammenzusuchen?`,
    cta: "Wie handhaben Sie das in Ihrem Unternehmen?",
  },
];

export const POLL_TEMPLATES = [
  {
    title: "Audit-Nachweise Verwaltung",
    question: "Wie verwalten Sie aktuell Audit-Nachweise?",
    options: ["Excel", "SharePoint", "Ordnerstruktur", "Spezielle Software"],
    category: "audit" as ContentCategory,
  },
  {
    title: "Geschwindigkeit Audit-Bereitstellung",
    question: "Wie schnell könnten Sie alle Nachweise für ein Audit bereitstellen?",
    options: ["Sofort", "Innerhalb von 1 Tag", "Mehrere Tage", "Keine Ahnung"],
    category: "evidence" as ContentCategory,
  },
  {
    title: "Lieferantenbewertung dokumentiert",
    question: "Wird die Lieferantenbewertung in Ihrem Unternehmen dokumentiert?",
    options: ["Ja vollständig", "Teilweise", "Kaum", "Gar nicht"],
    category: "vendor" as ContentCategory,
  },
];

export const CONTENT_SERIES: ContentSeriesDefinition[] = [
  {
    slug: "audit_prep_5_days",
    name: "5 Tage Audit Vorbereitung",
    category: "audit",
    hub_area: "campaign_series",
    description: "Serie zur strukturierten Audit-Vorbereitung",
    days: [
      { day: 1, title: "Tag 1 — Risiken", category: "risk", topic: "risks" },
      { day: 2, title: "Tag 2 — Maßnahmen", category: "audit", topic: "measures" },
      { day: 3, title: "Tag 3 — Lieferanten", category: "vendor", topic: "vendors" },
      { day: 4, title: "Tag 4 — Schulungen", category: "training", topic: "training" },
      { day: 5, title: "Tag 5 — Nachweise & Audit", category: "evidence", topic: "evidence_audit" },
    ],
  },
  {
    slug: "nis2_errors_7_days",
    name: "7 häufige NIS2 Fehler",
    category: "problem_based",
    hub_area: "campaign_series",
    description: "Häufige Fehler in der NIS2-Umsetzung",
    days: [
      { day: 1, title: "Fehler 1 — Keine Nachweise", category: "evidence", topic: "no_evidence" },
      { day: 2, title: "Fehler 2 — Keine Verantwortlichkeiten", category: "management", topic: "no_owners" },
      { day: 3, title: "Fehler 3 — Lieferanten nicht bewertet", category: "vendor", topic: "vendors" },
      { day: 4, title: "Fehler 4 — Schulungen fehlen", category: "training", topic: "training" },
      { day: 5, title: "Fehler 5 — Keine Auditstruktur", category: "audit", topic: "audit_structure" },
      { day: 6, title: "Fehler 6 — Maßnahmen nicht verfolgt", category: "risk", topic: "tasks" },
      { day: 7, title: "Fehler 7 — Dokumente nicht aktuell", category: "evidence", topic: "outdated_docs" },
    ],
  },
];

export const MINI_CASE_TEMPLATE = {
  title: "Mini Case — Nachweiscenter",
  category: "evidence" as ContentCategory,
  hub_area: "mini_cases" as ContentHubArea,
  situation: "Ein Unternehmen hatte Schulungen, Nachweise und Lieferantenbewertungen — verteilt auf mehrere Ordner.",
  problem: "Vor einem Audit mussten Dokumente mühsam zusammengesucht werden.",
  solution: "Zentrale Struktur mit Nachweiscenter, Aufgaben und Audit-Export.",
  outcome: "Unterlagen konnten innerhalb weniger Minuten bereitgestellt werden.",
};

export const SYSTEMHAUS_POSTS = [
  {
    title: "Systemhaus — Dokumentation jenseits von M365",
    body: `Viele IT-Dienstleister unterstützen Kunden bereits bei:

- Microsoft 365
- Backup
- Security

Aber wie werden Risiken, Nachweise und Audit-Anforderungen dokumentiert?

Nicht als Extra-Projekt — sondern als wiederholbare Struktur für jeden Mandanten.`,
    category: "systemhaus" as ContentCategory,
    hub_area: "industry" as ContentHubArea,
  },
  {
    title: "Wissen vs. Dokumentation",
    body: `Systemhäuser sitzen häufig auf wertvollem Wissen.

Die Herausforderung ist oft die Dokumentation.

Was wurde wann gemacht?
Wo liegt der Nachweis?
Wie zeigen Sie das im Kunden-Audit?`,
    category: "systemhaus" as ContentCategory,
    hub_area: "industry" as ContentHubArea,
  },
];

export const CEO_POSTS = [
  {
    title: "Die wichtigste Compliance-Frage",
    body: `Die wichtigste Frage ist oft nicht:

„Sind wir compliant?"

Sondern:

„Wissen wir überhaupt, was noch fehlt?"

Ohne Übersicht wird jedes Audit zum Rätselraten.`,
    category: "management" as ContentCategory,
    hub_area: "ceo_content" as ContentHubArea,
  },
  {
    title: "GF will keine 200 Seiten",
    body: `Geschäftsführer wollen keine 200 Seiten Dokumentation lesen.

Sie wollen wissen:

- Wo stehen wir?
- Was fehlt?
- Was müssen wir tun?

Management-Sicht statt Dokumentenstapel.`,
    category: "management" as ContentCategory,
    hub_area: "ceo_content" as ContentHubArea,
  },
];

export const PRODUCT_INSIGHT_SNIPPETS = [
  "Aus Kundenfeedback heraus haben wir die zentrale Verwaltung von Schulungsunterlagen und Nachweisen ausgebaut.",
  "Ein Kunde fragte uns, wo MFA-Schulungen und Phishing-Auswertungen abgelegt werden sollen — genau dort setzt das Nachweiscenter an.",
  "Statt Feature-Listen zu posten: echte Situationen aus Audits und Beratungsmandaten.",
];
