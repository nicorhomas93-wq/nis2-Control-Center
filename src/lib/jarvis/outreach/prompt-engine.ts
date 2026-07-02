import OpenAI from "openai";
import type { LeadAnalysisResult } from "@/lib/jarvis/outreach/website-analyzer";
import {
  OUTREACH_MIN_VISIBLE_SCORE,
  OUTREACH_PRIORITY_SCORE,
  PARTNER_QUALIFIED_SCORE,
  PARTNER_PRIORITY_SCORE,
} from "@/lib/jarvis/outreach/constants";
import type { PartnerLeadCategory } from "@/lib/jarvis/outreach/partner-categories";
import { PARTNER_CATEGORY_LABELS } from "@/lib/jarvis/outreach/partner-categories";

export type OutreachMessageMode = "high_value" | "mid_value" | "low";

interface MessageContext {
  greeting: string;
  company: string;
  industry: string;
  observation: string;
  question: string;
}

const CLOSING_QUESTIONS = [
  "Wie ist das bei euch gelöst?",
  "Ist das bei Ihnen aktuell Thema?",
  "Habt ihr das intern schon strukturiert?",
  "Steht das bei euch gerade an — oder ist es abgehakt?",
  "Wie sieht das bei Ihnen aus?",
] as const;

const HIGH_TEMPLATES: ((ctx: MessageContext) => string)[] = [
  (ctx) =>
    `${ctx.greeting}\n\nbei ${ctx.industry} sehe ich aktuell oft: Audits oder Kunden fordern NIS2-Nachweise — und es fehlt eine prüfbare Basis.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\nmir ist bei ${ctx.company} aufgefallen: ${ctx.observation.toLowerCase()} — das führt schnell zu Problemen, wenn Nachweise fällig werden.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\nin Unternehmen aus ${ctx.industry} passiert gerade häufig: Lieferanten verlangen Nachweise — Verantwortlichkeiten und Dokumente fehlen.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\nrund um ${ctx.company}: NIS2 kommt über Kunden oder Prüfungen — und dann fehlt der Audit-Ordner.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\ntypisch für ${ctx.industry} gerade: Nachweise werden angefordert, bevor intern alles steht.\n\n${ctx.question}`,
];

const MID_TEMPLATES: ((ctx: MessageContext) => string)[] = [
  (ctx) =>
    `${ctx.greeting}\n\nbei Partnern aus ${ctx.industry} höre ich gerade oft: Kunden fragen nach NIS2-Nachweisen — und intern fehlt eine wiederholbare Struktur.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\n${ctx.observation} — bei ${ctx.company} könnte das relevant sein, wenn Sie KMU-Kunden betreuen.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\nin ${ctx.industry} wird NIS2 zunehmend über Kundenanfragen relevant — nicht nur über Gesetzeslesen.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\nkurz zu ${ctx.company}: ${ctx.observation.toLowerCase()}.\nPasst NIS2-Nachweis-Thema bei Ihren Kunden gerade — oder eher nicht?\n\n${ctx.question}`,
];

const FORBIDDEN_PATTERNS = [
  /\bwir helfen\b/gi,
  /\bwir unterstützen\b/gi,
  /\bgerne stehen wir\b/gi,
  /\bunverbindlich\b/gi,
  /\bkeine verpflichtung\b/gi,
  /\bbetroffenheitscheck\b/gi,
  /\baudit-ordner\b/gi,
  /\bfunktionen:\b/gi,
  /\bfeature\b/gi,
  /\bzip-export\b/gi,
  /\bpdf-export\b/gi,
  /\bcontrol center\b/gi,
  /\bmodul\b/gi,
];

export function classifyOutreachMessageMode(
  score: number | null | undefined,
  partnerScore?: number | null
): OutreachMessageMode {
  const s =
    partnerScore != null
      ? partnerScore >= PARTNER_PRIORITY_SCORE
        ? 10
        : partnerScore >= PARTNER_QUALIFIED_SCORE
          ? 7
          : 3
      : (score ?? 0);
  if (s >= OUTREACH_PRIORITY_SCORE) return "high_value";
  if (s >= OUTREACH_MIN_VISIBLE_SCORE) return "mid_value";
  return "low";
}

export interface OutreachPromptInput {
  company_name: string;
  industry: string | null;
  contact_role: string | null;
  contact_name: string | null;
  analysis: LeadAnalysisResult;
  partner_score?: number | null;
  lead_category?: PartnerLeadCategory | string | null;
}

export async function generateOutreachMessage(
  input: OutreachPromptInput
): Promise<string | null> {
  const mode = classifyOutreachMessageMode(
    input.analysis.nis2_relevance_score,
    input.partner_score
  );
  if (mode === "low") return null;

  const variant = pickVariantIndex(input.company_name, mode === "high_value" ? 5 : 4);
  const ai = await generateWithOpenAI(input, mode, variant);
  if (ai) return sanitizeMessage(ai);
  return generateFallbackMessage(input, mode, variant);
}

function pickVariantIndex(seed: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 9973;
  }
  return hash % count;
}

function outreachObservation(input: OutreachPromptInput): string {
  const obs = input.analysis.observation.replace(/\.$/, "");
  const isAssessmentNote =
    obs.includes("Bewertbarkeit") ||
    obs.includes("verifizierbar") ||
    obs.includes("verifiziert") ||
    obs.includes("Angriffsfläche") ||
    input.analysis.assessment_flags.includes("Informationslücke");

  if (isAssessmentNote) {
    const industry = input.industry ?? "Ihrer Branche";
    return `in ${industry} werden NIS2-Nachweise zunehmend über Audits und Partneranfragen relevant`;
  }
  return obs;
}

function buildContext(input: OutreachPromptInput): MessageContext {
  return {
    greeting: input.contact_name ? `Hallo ${input.contact_name},` : "Hallo,",
    company: input.company_name,
    industry: input.industry ?? "Ihrer Branche",
    observation: outreachObservation(input),
    question: CLOSING_QUESTIONS[pickVariantIndex(input.company_name + ":q", CLOSING_QUESTIONS.length)]!,
  };
}

function sanitizeMessage(text: string): string {
  let result = text.trim();
  for (const pattern of FORBIDDEN_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function generateFallbackMessage(
  input: OutreachPromptInput,
  mode: OutreachMessageMode,
  variant: number
): string {
  const ctx = buildContext(input);
  const templates = mode === "high_value" ? HIGH_TEMPLATES : MID_TEMPLATES;
  const template = templates[variant % templates.length]!;
  return sanitizeMessage(template(ctx));
}

function buildSystemPrompt(mode: OutreachMessageMode, variant: number): string {
  const variantHint = `Variante ${variant + 1} — nutze abweichende Satzstruktur zu anderen Varianten.`;

  if (mode === "high_value") {
    return `Du schreibst B2B-Partner-Erstnachrichten für IT-Dienstleister, MSP und Berater (TKND intern).

Modus: HIGH VALUE — extrem kurz (2–3 Sätze nach der Anrede).

${variantHint}

Zielgruppe: Systemhäuser, MSP, Security-/Datenschutz-/Compliance-Berater — keine Endkunden-Pitch.

Struktur:
1. Partner-/Branchenbezug (Kunden fragen nach NIS2-Nachweisen)
2. Sachliches Problem — ohne Panik, ohne Produktfeatures
3. Direkte Frage am Ende

Regeln:
- Deutsch, unter 10 Sekunden Lesezeit
- KEIN Feature-Listing, KEIN Produktpitch, KEIN Software-Verkauf
- KEIN „wir helfen/unterstützen“
- Keine Begriffe: Betroffenheitscheck, Audit-Ordner, ZIP, PDF, Funktionen, Control Center
- Nutze: Kunden fragen, Nachweise, Partner, Mandate, KMU-Kunden
- Keine Betreffzeile. Nur Nachrichtentext.`;
  }

  return `Du schreibst B2B-Partner-Erstnachrichten für IT-Dienstleister, MSP und Berater (TKND intern).

Modus: MID VALUE — 3–4 Sätze nach der Anrede.

${variantHint}

Zielgruppe: Partner, die NIS2 für Kunden umsetzen oder anbieten könnten.

Struktur:
1. Kurzer Partner-Kontext
2. Problem bei Kundenanfragen klar benennen
3. Genau 1 Satz Nutzenhypothese — ohne Features aufzuzählen
4. Direkte Frage

Regeln:
- Deutsch, schnell lesbar
- KEIN Marketing, KEINE Feature-Listen, KEIN Produktpitch
- Keine Begriffe: Betroffenheitscheck, Audit-Ordner, ZIP, PDF, Funktionen
- Keine Betreffzeile. Nur Nachrichtentext.`;
}

async function generateWithOpenAI(
  input: OutreachPromptInput,
  mode: OutreachMessageMode,
  variant: number
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;

  const ctx = buildContext(input);
  const bullets = input.analysis.analysis_bullets.map((b) => `- ${b}`).join("\n");

  const categoryLabel = input.lead_category
    ? PARTNER_CATEGORY_LABELS[input.lead_category as PartnerLeadCategory] ?? input.lead_category
    : input.industry ?? "unbekannt";

  const userPrompt = `Firma: ${input.company_name}
Partner-Kategorie: ${categoryLabel}
Branche: ${input.industry ?? "unbekannt"}
Rolle: ${input.contact_role ?? "Entscheider"}
Ansprechpartner: ${input.contact_name ?? "—"}
Partner-Score: ${input.partner_score ?? "?"}/100
NIS2-Score (legacy): ${input.analysis.nis2_relevance_score ?? "?"}/10
Modus: ${mode}
Variante: ${variant + 1}
Bevorzugte Schlussfrage (oder gleichwertige Variante): „${ctx.question}“

Was fällt auf: ${input.analysis.observation}

Analyse:
${bullets}

Schreibe NUR die sendbare Nachricht — kein Kommentar, keine Erklärung.`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(mode, variant) },
        { role: "user", content: userPrompt },
      ],
      temperature: mode === "high_value" ? 0.72 : 0.68,
      max_tokens: mode === "high_value" ? 180 : 260,
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/** 1-Satz-Hook für Lead-Listen — Partner-Fokus */
export function buildPartnerOutreachHook(input: {
  company_name: string;
  category: PartnerLeadCategory | string;
  partner_score: number;
}): string {
  const label =
    PARTNER_CATEGORY_LABELS[input.category as PartnerLeadCategory] ?? String(input.category);
  if (input.partner_score >= 80) {
    return `${label}: ${input.company_name} — starker Partner-Lead (${input.partner_score}/100). Kunden-NIS2-Nachweise relevant?`;
  }
  if (input.partner_score >= 60) {
    return `${label}: ${input.company_name} — Partner-Lead prüfen (${input.partner_score}/100).`;
  }
  return `${input.company_name} — später prüfen (${input.partner_score}/100).`;
}

/** @deprecated Nutze buildPartnerOutreachHook */
export function buildOutreachHook(input: {
  company_name: string;
  industry: string;
  employee_count: number;
  hasSecurity?: boolean;
}): string {
  return `Partner-Kontext ${input.industry}: Fragen Ihre Kunden zu NIS2-Nachweisen — wie lösen Sie das bei ${input.company_name}?`;
}
