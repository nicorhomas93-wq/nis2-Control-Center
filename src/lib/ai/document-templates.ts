import type { Company } from "@/lib/types";
import { getNis2StatusLabel } from "@/lib/nis2/betroffenheit";
import { formatCurrency } from "@/lib/utils";

export const NIS2_COMPLIANCE_REFERENCE =
  "Dieses Dokument orientiert sich an den Anforderungen der NIS2-Richtlinie zur Stärkung der Netzwerk- und Informationssicherheit, insbesondere in Bezug auf Risikomanagement, organisatorische Verantwortlichkeiten, Sicherheitsmaßnahmen, Nachweisführung und Meldeprozesse.";

export const DOCUMENT_DISCLAIMER =
  "Dieses Dokument dient der internen Orientierung und operativen Umsetzung. Es ersetzt keine individuelle rechtliche oder fachliche Prüfung.";

export const STANDARD_DOCUMENT_SECTIONS = `
Pflichtstruktur (als Markdown mit ## Überschriften):
1. Zweck des Dokuments
2. Geltungsbereich
3. Unternehmenskontext
4. Rechtlicher und organisatorischer Bezug zu NIS2
5. Rollen und Verantwortlichkeiten
6. Prozessbeschreibung
7. Maßnahmen und Anforderungen
8. Nachweise und Dokumentationspflichten
9. Überprüfung und Aktualisierung
10. Offene Punkte

Der Abschnitt „Rechtlicher und organisatorischer Bezug zu NIS2“ muss folgende Formulierung enthalten oder sinngemäß aufgreifen:
„${NIS2_COMPLIANCE_REFERENCE}“

Wichtig zum Dokumentabschluss:
- KEIN eigener Hinweis-, Disclaimer- oder Erzeugungsabschnitt am Ende — wird automatisch ergänzt
- Nach „Offene Punkte“ endet der Inhalt

Schreibweise (mit Bindestrich, fehlerfrei):
- NIS2-Richtlinie, NIS2-Umsetzung, ICT-Dienstleistungen, IT-Dienstleister, Cyber-Bedrohungen
- Sicherheitskonzept, gegebenenfalls, jedoch
- Keine OCR-Fehler (z. B. „Cvber“, „iedoch“, „Umsetzuna“)

Listenformat:
- Prozessbeschreibung: nummerierte Liste (1., 2., 3., …)
- Nachweise und Offene Punkte: Bulletliste mit „- “ pro Zeile
- Keine Mischformen, Backticks oder Sternchen als Listenmarker

Anforderungen:
- Mindestens 1000 Wörter (Ziel: 1000 bis 1500), ausführlich und audit-tauglich
- Keine Platzhalter wie [Name] oder [Unternehmen]
- Konkrete Bezugnahme auf die Unternehmensdaten
- Prüfbare, umsetzbare Aussagen
- Professioneller B2B-Stil auf Deutsch
`.trim();

export function formatCompanyContextBlock(company: Company): string {
  const contact = company.security_contact_name
    ? `${company.security_contact_name}${company.security_contact_email ? ` (${company.security_contact_email})` : ""}`
    : "noch zu benennen";

  return `
Unternehmensname: ${company.company_name ?? "Nicht angegeben"}
Branche: ${company.industry ?? "Nicht angegeben"}
Mitarbeiterzahl: ${company.employee_count ?? "Nicht angegeben"}
Jahresumsatz: ${company.annual_revenue != null ? formatCurrency(company.annual_revenue) : "Nicht angegeben"}
Bilanzsumme: ${company.balance_sheet_total != null ? formatCurrency(company.balance_sheet_total) : "Nicht angegeben"}
Land: ${company.country ?? "DE"}
EU-weit tätig: ${company.eu_operations ? "Ja" : "Nein"}
Microsoft 365: ${company.uses_microsoft_365 ? "Ja" : "Nein"}
Cloud-Dienste: ${company.uses_cloud_services ? "Ja" : "Nein"}
Kritische Geschäftsprozesse: ${company.critical_business_processes ?? "Nicht dokumentiert"}
IT-Dienstleister vorhanden: ${company.has_it_service_provider ? "Ja" : "Nein"}
Öffentlich erreichbare Systeme: ${company.publicly_accessible_systems ? "Ja" : "Nein"}
Ansprechpartner Informationssicherheit: ${contact}
NIS2-Status: ${getNis2StatusLabel(company.nis2_status)}
Compliance-Score: ${company.compliance_score}%
`.trim();
}

export function getTypeSpecificInstructions(documentType: string): string {
  const instructions: Record<string, string> = {
    nis2_betroffenheitsanalyse: `
Spezifische Inhalte:
- Einordnung anhand Branche, Mitarbeiterzahl, Umsatz, Bilanzsumme, EU-Tätigkeit, Cloud-Nutzung und kritischen Prozessen
- Begründete Ergebnisdarstellung mit NIS2-Status
- Konkrete nächste Schritte und Empfehlungen
- Bewertung der Größenschwellenwerte und Sektorzuordnung`,

    informationssicherheitsleitlinie: `
Spezifische Inhalte:
- Sicherheitsziele (Vertraulichkeit, Integrität, Verfügbarkeit)
- Verantwortung der Geschäftsleitung
- Zugriffsschutz und Authentifizierung
- Schulungs- und Awareness-Konzept
- Umgang mit Sicherheitsvorfällen
- Kontinuierliche Verbesserung und Policy-Review`,

    risikoanalyse: `
Spezifische Inhalte:
- Identifikation relevanter Assets
- Bedrohungen und Schwachstellen
- Risikobewertung (hoch/mittel/niedrig) mit Begründung
- Behandlungsmaßnahmen je Risiko
- Priorisierung und Restrisiko
- Tabelle: Asset | Bedrohung | Schwachstelle | Risiko | Maßnahme`,

    massnahmenplan: `
Spezifische Inhalte:
- Priorisierte Maßnahmenliste mit Kategorien (organisatorisch, technisch, personell)
- Verantwortlichkeiten und Zielzustände
- Fristenlogik (kurzfristig 0-3 Monate, mittelfristig 3-12 Monate, langfristig)
- Abhängigkeiten und Ressourcenbedarf`,

    incident_response_plan: `
Spezifische Inhalte:
- Erkennung und Meldewege
- Bewertung und Klassifizierung von Vorfällen
- Eskalationsstufen und Sofortmaßnahmen
- Interne und externe Kommunikation
- Dokumentationspflichten (24h/72h-Logik)
- Nachbereitung und Lessons Learned`,

    backup_konzept: `
Spezifische Inhalte:
- Backup-Ziele (RPO/RTO)
- Backup-Arten (voll, inkrementell, Cloud, lokal)
- Wiederherstellungszeiten und -prozesse
- Verantwortlichkeiten
- Testintervalle und Protokollierung`,

    zugriffskonzept: `
Spezifische Inhalte:
- Benutzerrollen und Berechtigungsmatrix
- Rechtevergabe nach Need-to-know
- MFA-Anforderungen
- Admin-Konten und Privileged Access
- Rezertifizierung und Offboarding`,

    lieferantenbewertung: `
Spezifische Inhalte:
- Kritikalität von Lieferanten und IT-Dienstleistern
- Sicherheitsanforderungen an Dritte
- Vertrags- und SLA-Prüfung
- Nachweispflichten (ISO 27001, SOC2, AV-Verträge)
- Lieferketten-Risikomanagement`,

    meldeprozess: `
Spezifische Inhalte:
- Interne Meldewege und Erstmeldung
- Bewertung der Erheblichkeit
- Meldefristen gemäß NIS2 (24h/72h/1 Monat)
- Verantwortlichkeiten und Eskalation
- Dokumentations- und Nachweispflichten`,

    management_zusammenfassung: `
Spezifische Inhalte:
- Aktueller NIS2- und Compliance-Status
- Wesentliche Risiken und Trends
- Offene Maßnahmen und Fortschritt
- Empfehlungen für die Geschäftsleitung
- Ressourcen- und Investitionsbedarf`,
  };

  return instructions[documentType] ?? "";
}
