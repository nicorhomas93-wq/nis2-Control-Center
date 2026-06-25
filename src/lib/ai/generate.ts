import OpenAI from "openai";
import type { Company } from "@/lib/types";
import { buildDocumentPrompt } from "@/lib/ai/document-prompts";
import { generateFallbackDocument } from "@/lib/ai/document-fallback";

const SYSTEM_PROMPT = `Du bist ein Senior-Consultant für NIS2-Compliance und Informationssicherheit in Deutschland.
Du erstellst audit-taugliche Dokumente auf Deutsch.

Sprache und Qualität:
- Verwende korrektes Deutsch. Erzeuge keine OCR-artigen Schreibfehler.
- Achte besonders auf folgende Schreibweisen: Nutzung, Bedeutung, Umsetzung, Sicherheitskonzept, Sicherheitskonzepts, Cyber-Bedrohungen, NIS2-Richtlinie, ICT-Dienstleistungen, IT-Dienstleister, gegebenenfalls, jedoch.
- Keine Buchstabenvertauschungen, keine Wörter mitten im Satz abgeschnitten
- Keine Backticks, keine einzelnen Sternchen, keine gemischten Listenzeichen

Konsistente Begriffe (immer mit Bindestrich bzw. korrekter Schreibweise):
- NIS2-Richtlinie
- Cyber-Bedrohungen
- ICT-Dienstleistungen
- IT-Dienstleister
- Sicherheitskonzept / Sicherheitskonzepts
- gegebenenfalls
- jedoch

Listenformat:
- Prozessschritte in „Prozessbeschreibung“ als nummerierte Liste (1., 2., 3., …)
- Nachweise und „Offene Punkte“ als Bulletliste mit „- “ am Zeilenanfang
- Keine Mischformen wie „·“, „5·“ oder verwaiste „1.“-Zeilen

Regeln:
- Mindestens 1000 Wörter, idealerweise 1000 bis 1500 Wörter, ausführlich und praxisnah
- Keine Platzhalter wie [Name] oder [Unternehmen]
- Markdown mit # und ## Überschriften
- Pflichtabschnitte: Zweck, Geltungsbereich, Unternehmenskontext, NIS2-Bezug, Rollen, Prozessbeschreibung, Konkrete Maßnahmen, Nachweise, Überprüfung und Aktualisierung, Offene Punkte
- Keine Hinweis-, Disclaimer- oder Erzeugungsabschnitte am Ende — wird automatisch ergänzt
- Keine Garantieformulierungen, keine Aussage „rechtssicher“, keine Rechtsberatung
- Konkrete Bezugnahme auf die gelieferten Unternehmensdaten`;

export async function generateWithAI(prompt: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
      max_tokens: 8000,
    });
    return completion.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export { buildDocumentPrompt, generateFallbackDocument };

export function buildRiskAnalysisPrompt(company: Company): string {
  return buildDocumentPrompt(company, "risikoanalyse");
}

export function buildIncidentReportPrompt(
  company: Company,
  title: string,
  description: string
): string {
  return `Erstelle einen Incident-Response-Bericht auf Deutsch (mindestens 600 Wörter).

Unternehmen: ${company.company_name ?? "Nicht angegeben"}
Vorfall: ${title}
Beschreibung: ${description}

Struktur: Erkennung, Bewertung, betroffene Systeme, Sofortmaßnahmen, Meldepflicht 24h/72h, Kommunikation, Nachbereitung.`;
}

export function buildAuditSummaryPrompt(company: Company): string {
  return `Erstelle eine kompakte Management-Zusammenfassung auf Deutsch (400–600 Wörter) für einen NIS2-Audit-Ordner.

Unternehmen: ${company.company_name ?? "Nicht angegeben"}
NIS2-Status: ${company.nis2_status}
Compliance-Score: ${company.compliance_score ?? 0} %

Fokus: Gesamteinschätzung, kritische Lücken, Prioritäten für die Geschäftsleitung.
Keine Rechtsberatung, keine Garantieformulierungen.
Verwende korrektes Deutsch ohne OCR-artige Fehler.`;
}

export function generateFallbackRiskAnalysis(company: Company): string {
  return generateFallbackDocument(company, "risikoanalyse");
}

export function generateFallbackIncidentReport(
  company: Company,
  title: string,
  description: string
): string {
  const base = generateFallbackDocument(company, "incident_response_plan");
  return `${base}\n\n## Konkreter Vorfall\n\n**Titel:** ${title}\n\n**Beschreibung:** ${description}`;
}

export function generateFallbackAuditSummary(company: Company): string {
  return generateFallbackDocument(company, "management_zusammenfassung");
}
