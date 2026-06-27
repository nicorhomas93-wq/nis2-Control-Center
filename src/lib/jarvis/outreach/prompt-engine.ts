import OpenAI from "openai";
import type { LeadAnalysisResult } from "@/lib/jarvis/outreach/website-analyzer";

const OUTREACH_SYSTEM = `Du schreibst kurze B2B-Erstnachrichten für TKND NIS2 Control Center (NIS2-Compliance-Software).

Regeln:
- Maximal 5–6 Sätze, Deutsch
- Locker, direkt, persönlich — kein Marketing-Blabla
- Kein „wir sind die besten“, keine Buzzwords
- Struktur: Bezug zur Firma → konkretes Risiko/Problem → 1 Satz Ansatz → einfache Frage
- Ziel: Gespräch anstoßen, nicht verkaufen
- Keine Betreffzeile, nur Nachrichtentext
- Anrede mit Rolle wenn vorhanden (z. B. „Hallo Herr/Frau …“ oder „Hallo …“)`;

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
NIS2-Einschätzung: ${input.analysis.nis2_likelihood} (Score ${input.analysis.nis2_relevance_score ?? "?"}/10)
IT-Reife: ${input.analysis.it_maturity}
Was fällt auf: ${input.analysis.observation}

Analyse-Stichpunkte:
${bullets}

Schreibe eine sendbare Erstnachricht.`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: OUTREACH_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

function generateFallbackMessage(input: OutreachPromptInput): string {
  const role = input.contact_role ?? "Entscheider";
  const industry = input.industry ?? "Ihrer Branche";
  const observation = input.analysis.observation;
  const greeting = input.contact_name ? `Hallo ${input.contact_name},` : `Hallo,`;

  const nis2Hint =
    input.analysis.nis2_likelihood === "yes"
      ? "NIS2-Thema dürfte bei Ihnen nicht mehr nur „irgendwann“ sein"
      : "NIS2 kommt bei vielen Firmen plötzlich über Kunden, Partner oder Audits";

  return `${greeting}

ich bin gerade bei ${input.company_name} gelandet — ${observation.toLowerCase()}.

Bei ${industry} sehe ich oft: ${nis2Hint}, aber die Nachweise (Verantwortlichkeiten, Dokumente, Audit-Ordner) fehlen noch strukturiert.

Wir helfen Mittelständlern, das ohne großes Beratungsprojekt in einem System abzubilden — kurz und prüfbar.

Ist NIS2 bei Ihnen gerade aktiv Thema, ${role}, oder steht es noch hinten an?`;
}
