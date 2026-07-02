import type { ExtendedResponseType } from "@/lib/jarvis/kampagnen/response-classifier";
import { followUpInDays } from "@/lib/jarvis/kampagnen/lead-actions";

function firstName(contactName?: string | null): string {
  if (!contactName?.trim()) return "";
  return contactName.trim().split(/\s+/)[0] ?? "";
}

function greeting(contactName?: string | null): string {
  const name = firstName(contactName);
  return name ? `Hallo ${name},` : "Hallo,";
}

export function buildReplySuggestion(input: {
  response_type: ExtendedResponseType;
  contact_name?: string | null;
  company_name?: string | null;
}): string {
  const g = greeting(input.contact_name);

  switch (input.response_type) {
    case "interest":
      return `${g}

vielen Dank für Ihre Rückmeldung.

Gern zeige ich Ihnen das TKND NIS2 Control Center einmal kurz live. In 15 Minuten sieht man gut, wie Unternehmen oder Kunden strukturiert durch NIS2-Einstufung, Risiken, Maßnahmen, Nachweise, Lieferantenbewertung und Audit-Export geführt werden.

Wann würde es bei Ihnen grundsätzlich passen?

Viele Grüße
Nico Thomas`;

    case "info_requested":
      return `${g}

gern.

Kurz zusammengefasst:
Das TKND NIS2 Control Center unterstützt Unternehmen und IT-Dienstleister dabei, NIS2-Einstufung, Risiken, Maßnahmen, Aufgaben, Lieferantenbewertungen, Schulungen, Nachweise und Audit-Unterlagen zentral zu verwalten.

Besonders praktisch:
Alle relevanten Informationen können später als Audit-Report oder Audit-Paket exportiert werden.

Ich kann Ihnen gern zusätzlich eine kurze PDF-Übersicht senden.

Viele Grüße
Nico Thomas`;

    case "pricing_question":
    case "purchase_intent":
      return `${g}

aktuell gibt es drei Modelle:

- Basis ab 49 € monatlich
- Business ab 199 € monatlich
- Consultant/Systemhaus ab 699 € monatlich

Für IT-Dienstleister und Systemhäuser ist meist das Consultant-Modell interessant, weil dort Mandantenfähigkeit, Kundenverwaltung und White-Label-Optionen relevant werden.

Ich würde Ihnen gern kurz zeigen, welcher Umfang für Ihr Modell sinnvoll wäre, bevor ich etwas Falsches empfehle.

Viele Grüße
Nico Thomas`;

    case "management_review":
      return `${g}

vielen Dank für die Rückmeldung.

Das ist absolut nachvollziehbar. Wenn aus der Geschäftsführung Fragen auftauchen, kann ich gern kurz unterstützen oder die wichtigsten Punkte noch einmal kompakt zusammenfassen.

Aus meiner Sicht sind vor allem drei Punkte interessant:

- zentrale Übersicht über Risiken, Maßnahmen und Nachweise
- strukturierter Audit-Export als PDF/ZIP
- Mandantenfähigkeit für IT-Dienstleister und Systemhäuser

Ich melde mich gern in ein paar Tagen noch einmal kurz, falls das für Sie passt.

Viele Grüße
Nico Thomas`;

    case "security_question":
      return `${g}

verständlich, das ist bei einem Compliance-System ein zentraler Punkt.

Das System arbeitet mandantenbezogen mit Rollen-/Rechtekonzept. Risiken, Maßnahmen, Nachweise, Aufgaben, Lieferanten und Audit-Unterlagen werden jeweils dem passenden Unternehmen bzw. Mandanten zugeordnet.

Gern kann ich Ihnen in einer kurzen Demo zeigen, wie Mandanten, Rollen und Audit-Exporte aufgebaut sind.

Viele Grüße
Nico Thomas`;

    case "technical_question":
      return `${g}

gute Frage — gern im Detail.

In einer kurzen Demo kann ich Ihnen zeigen, wie Einstufung, Risiken, Maßnahmen, Nachweise und Exporte im System zusammenspielen. So sehen Sie schnell, ob der technische Aufbau zu Ihrem Setup passt.

Wann hätten Sie 15 Minuten für einen kurzen Austausch?

Viele Grüße
Nico Thomas`;

    case "demo_requested":
      return `${g}

sehr gern — ich zeige Ihnen das TKND NIS2 Control Center kurz live.

Passt Ihnen diese oder nächste Woche grundsätzlich? Dann schlage ich Ihnen 2–3 Termine vor.

Viele Grüße
Nico Thomas`;

    case "wrong_contact":
      return `${g}

vielen Dank für den Hinweis — das hilft mir sehr.

Könnten Sie mir gern die passende Kontaktperson oder E-Mail nennen? Dann wende ich mich direkt an die richtige Stelle.

Viele Grüße
Nico Thomas`;

    case "contact_later":
      return `${g}

vielen Dank für die ehrliche Rückmeldung.

Ich melde mich zu dem von Ihnen genannten Zeitpunkt gern noch einmal. Bis dahin stehe ich bei Rückfragen natürlich zur Verfügung.

Viele Grüße
Nico Thomas`;

    case "no_interest":
      return `${g}

vielen Dank für Ihre Rückmeldung — verstanden.

Ich melde mich nicht weiter. Falls sich der Bedarf später ändert, stehe ich gern zur Verfügung.

Viele Grüße
Nico Thomas`;

    case "internal_forward":
      return `${g}

vielen Dank — das ist hilfreich.

Gern richte ich mich an die zuständige Kollegin bzw. den zuständigen Kollegen. Eine kurze Weiterleitung oder Kontaktdaten wären super.

Viele Grüße
Nico Thomas`;

    case "unclear":
    default:
      return `${g}

vielen Dank für Ihre Nachricht.

Damit ich Ihnen gezielt antworten kann: Geht es eher um eine kurze Demo, eine Informationsübersicht oder eine Preis-/Lizenzfrage?

Viele Grüße
Nico Thomas`;
  }
}

export function suggestLicense(response_type: ExtendedResponseType): string | null {
  if (response_type === "pricing_question" || response_type === "purchase_intent") {
    return "Consultant/Systemhaus";
  }
  if (response_type === "interest" || response_type === "demo_requested") {
    return "Business";
  }
  return null;
}

export function followUpDaysForType(response_type: ExtendedResponseType): number | null {
  switch (response_type) {
    case "management_review":
      return 7;
    case "info_requested":
      return 6;
    case "pricing_question":
    case "purchase_intent":
      return 4;
    case "demo_requested":
    case "interest":
      return 5;
    case "contact_later":
      return 30;
    case "no_interest":
    case "wrong_contact":
      return null;
    default:
      return 7;
  }
}

export function offerNotesForType(
  response_type: ExtendedResponseType,
  company_name?: string | null
): string | null {
  if (!["pricing_question", "purchase_intent"].includes(response_type)) return null;
  return `Angebot vorbereiten für ${company_name ?? "Lead"} — Lizenzmodell abstimmen (Business vs. Consultant/White-Label).`;
}
