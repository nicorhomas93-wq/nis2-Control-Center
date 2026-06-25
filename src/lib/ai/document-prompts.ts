import type { Company } from "@/lib/types";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import {
  STANDARD_DOCUMENT_SECTIONS,
  formatCompanyContextBlock,
  getTypeSpecificInstructions,
} from "@/lib/ai/document-templates";

export function buildDocumentPrompt(company: Company, documentType: string): string {
  const label = getDocumentTypeLabel(documentType);
  const typeInstructions = getTypeSpecificInstructions(documentType);

  return `Erstelle ein vollständiges, audit-taugliches NIS2-Dokument auf Deutsch.

Dokumenttyp: ${label}

UNTERNEHMENSDATEN:
${formatCompanyContextBlock(company)}

${STANDARD_DOCUMENT_SECTIONS}

${typeInstructions}

Beginne mit einer klaren Hauptüberschrift (# ${label}). Verwende ## für Abschnittsüberschriften. Schreibe ausführlich (1000–1500 Wörter) und praxisnah in fehlerfreiem Hochdeutsch ohne OCR-artige Fehler. Nach „Offene Punkte“ keinen weiteren Abschnitt — Hinweise werden automatisch ergänzt.

Verwende konsistent: NIS2-Richtlinie, Cyber-Bedrohungen, ICT-Dienstleistungen, IT-Dienstleister, Sicherheitskonzept, gegebenenfalls, jedoch.

Listen: Prozessschritte nummeriert (1., 2., 3.); Nachweise und Offene Punkte als Bulletliste mit „- “. Keine Backticks, Sternchen oder „·“ als Listenmarker.`;
}
