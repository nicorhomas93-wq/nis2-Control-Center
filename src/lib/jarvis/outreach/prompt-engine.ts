import OpenAI from "openai";
import type { LeadAnalysisResult } from "@/lib/jarvis/outreach/website-analyzer";
import {
  OUTREACH_MIN_VISIBLE_SCORE,
  OUTREACH_PRIORITY_SCORE,
} from "@/lib/jarvis/outreach/constants";

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
    `${ctx.greeting}\n\nbei ${ctx.industry} sehe ich aktuell oft, dass NIS2 plötzlich Thema wird — ${ctx.observation.toLowerCase()}.\nWenn Audits oder Partner fragen, fehlen oft Verantwortlichkeiten und ein prüfbarer Audit-Ordner.\nStrukturierte Dokumentation schafft hier schnell Klarheit.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\nmir ist bei ${ctx.company} aufgefallen, dass die NIS2-Struktur dünn wirkt.\nDas passiert oft, wenn Dokumente nicht gebündelt sind und Verantwortlichkeiten unklar bleiben.\nEin klarer NIS2-Ordner beendet das Stochern in Excel und Ordnern.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\nin Unternehmen eurer Größe in ${ctx.industry} passiert gerade häufig: Nachweise kommen, bevor intern alles steht.\n${ctx.observation} — das führt zu Engpässen bei Audits oder Kundenanfragen.\nWer Nachweise gebündelt hat, spart Wochen, wenn die Anfrage kommt.\n\n${ctx.question}`,
  (ctx) =>
    `${ctx.greeting}\n\nich schaue mir ${ctx.company} an — ${ctx.observation.toLowerCase()}.\nBei ${ctx.industry} fordern Partner und Prüfungen zunehmend NIS2-Nachweise.\nGebündelte Nachweise reduzieren das Risiko, wenn die Anfrage kommt.\n\n${ctx.question}`,
];

const FORBIDDEN_PATTERNS = [
  /\bwir helfen\b/gi,
  /\bwir unterstützen\b/gi,
  /\bgerne stehen wir\b/gi,
  /\bunverbindlich\b/gi,
  /\bkeine verpflichtung\b/gi,
];

export function classifyOutreachMessageMode(
  score: number | null | undefined
): OutreachMessageMode {
  const s = score ?? 0;
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
}

export async function generateOutreachMessage(
  input: OutreachPromptInput
): Promise<string | null> {
  const mode = classifyOutreachMessageMode(input.analysis.nis2_relevance_score);
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
    return `Du schreibst B2B-Erstnachrichten für NIS2-Compliance (TKND).

Modus: HIGH VALUE — extrem kurz (2–3 Sätze nach der Anrede).

${variantHint}

Struktur:
1. Branchenbezug oder Firma (wechselnde Einstiege, z. B. „bei {{Branche}} sehe ich aktuell oft…“, „mir ist bei {{Firma}} aufgefallen…“)
2. Risiko klar benennen — sachlich, ohne Panik
3. Direkte Frage am Ende

Regeln:
- Deutsch, unter 10 Sekunden Lesezeit
- KEIN Erklären, KEIN Produktpitch, KEIN „wir helfen/unterstützen“
- Vermeide: könnte, würde, eventuell, vielleicht
- Nutze: fehlt, passiert, führt, kommt, steht an
- Keine Betreffzeile. Nur Nachrichtentext.
- Anrede: „Hallo [Name],“ oder „Hallo,“`;
  }

  return `Du schreibst B2B-Erstnachrichten für NIS2-Compliance (TKND).

Modus: MID VALUE — 3–4 Sätze nach der Anrede.

${variantHint}

Struktur:
1. Kurzer Kontext (Firma/Branche/Beobachtung)
2. Problem klar benennen
3. Genau 1 Satz Lösungsansatz — ohne Software zu erklären, ohne „wir helfen“
4. Direkte Frage (wechselnd, z. B. „Wie ist das bei euch gelöst?“, „Ist das bei Ihnen aktuell Thema?“)

Regeln:
- Deutsch, schnell lesbar
- KEIN Marketing, KEIN Sales-Blabla, KEINE lange Texte
- Vermeide: könnte, würde, eventuell
- Nutze: fehlt, passiert, führt
- Keine Betreffzeile. Nur Nachrichtentext.
- Anrede: „Hallo [Name],“ oder „Hallo,“`;
}

async function generateWithOpenAI(
  input: OutreachPromptInput,
  mode: OutreachMessageMode,
  variant: number
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;

  const ctx = buildContext(input);
  const bullets = input.analysis.analysis_bullets.map((b) => `- ${b}`).join("\n");

  const userPrompt = `Firma: ${input.company_name}
Branche: ${input.industry ?? "unbekannt"}
Rolle: ${input.contact_role ?? "Entscheider"}
Ansprechpartner: ${input.contact_name ?? "—"}
NIS2-Score: ${input.analysis.nis2_relevance_score ?? "?"}/10
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

/** 1-Satz-Hook für Lead-Listen (gleicher Ton wie Erstnachricht) */
export function buildOutreachHook(input: {
  company_name: string;
  industry: string;
  employee_count: number;
  hasSecurity?: boolean;
}): string {
  const industry = input.industry;
  if (!input.hasSecurity) {
    return `Bei ${input.company_name} fehlt online die sichtbare NIS2-Struktur — ist das bei Ihnen bereits adressiert?`;
  }
  return `Als ${industry}-Unternehmen mit ${input.employee_count} MA fehlt oft die prüfbare NIS2-Basis — wie sieht das bei ${input.company_name} aus?`;
}
