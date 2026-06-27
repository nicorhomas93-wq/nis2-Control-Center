import OpenAI from "openai";
import type { LeadAnalysisResult } from "@/lib/jarvis/outreach/website-analyzer";

const OUTREACH_SYSTEM = `Du schreibst B2B-Erstnachrichten für TKND NIS2 Control Center (NIS2-Compliance-Software).

Ziel: Antwort erzwingen durch klare Problembewusstheit — ohne Spam, ohne Verkaufsdruck.

Regeln:
- Maximal 4–5 Sätze, Deutsch
- KEIN Marketing-Blabla, KEIN „wir helfen gerne“, KEINE Buzzwords
- Klar, direkt, leicht dominant — ruhig aber bestimmt
- Fokus: Risiko + Realität, keine Füllwörter
- Vermeide: „könnte“, „würde“, „eventuell“, „vielleicht“, „möglicherweise“
- Nutze stattdessen: „fehlt“, „passiert“, „führt“, „kommt“, „steht an“

Struktur (genau):
1. Konkreter Bezug zur Firma (Name, Branche oder Beobachtung)
2. Klares Risiko — sachlich, ohne Panik
3. Ansatz in 1 Satz: NIS2-Dokumentation + Audit-Ordner strukturiert abbilden, ohne großes Beratungsprojekt
4. Direkte Frage am Ende — zwingt zur Antwort (ja/nein oder Status)

Ton: erfahrener Ansprechpartner, nicht Verkäufer.
Keine Betreffzeile. Nur Nachrichtentext.
Anrede: „Hallo [Name],“ oder „Hallo,“ wenn kein Name.`;

export interface OutreachPromptInput {
  company_name: string;
  industry: string | null;
  contact_role: string | null;
  contact_name: string | null;
  analysis: LeadAnalysisResult;
}

export async function generateOutreachMessage(
  input: OutreachPromptInput
): Promise<string> {
  const ai = await generateWithOpenAI(input);
  if (ai) return ai;
  return generateFallbackMessage(input);
}

async function generateWithOpenAI(input: OutreachPromptInput): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;

  const bullets = input.analysis.analysis_bullets.map((b) => `- ${b}`).join("\n");
  const userPrompt = `Firma: ${input.company_name}
Branche: ${input.industry ?? "unbekannt"}
Rolle: ${input.contact_role ?? "Entscheider"}
Ansprechpartner: ${input.contact_name ?? "—"}
NIS2-Score: ${input.analysis.nis2_relevance_score ?? "?"}/10
Was fällt auf: ${input.analysis.observation}

Analyse:
${bullets}

Schreibe NUR die sendbare Nachricht — kein Kommentar, keine Erklärung.`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: OUTREACH_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.55,
      max_tokens: 320,
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

function generateFallbackMessage(input: OutreachPromptInput): string {
  const greeting = input.contact_name ? `Hallo ${input.contact_name},` : "Hallo,";
  const industry = input.industry ?? "Ihrer Branche";
  const observation = input.analysis.observation.replace(/\.$/, "");
  const risk = buildRiskLine(industry, input.analysis.nis2_likelihood === "yes");

  return `${greeting}

ich schaue mir gerade ${input.company_name} an — ${observation.toLowerCase()}.

${risk}

Wir bilden NIS2-Dokumentation und Audit-Ordner in einem System ab — ohne Beratungsprojekt, in wenigen Tagen startklar.

Ist das bei Ihnen schon strukturiert — oder fehlt Ihnen die Basis noch?`;
}

function buildRiskLine(industry: string, highRelevance: boolean): string {
  if (highRelevance) {
    return `Bei ${industry} passiert das regelmäßig: Audits und Partner fordern NIS2-Nachweise — und es fehlen Verantwortlichkeiten, Dokumente und ein prüfbarer Audit-Ordner.`;
  }
  return `Bei ${industry} kommt NIS2 plötzlich über Kunden oder Lieferanten — und dann fehlen Verantwortlichkeiten, Dokumente und ein prüfbarer Audit-Ordner.`;
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
