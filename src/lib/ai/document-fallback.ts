import type { Company, DocumentType } from "@/lib/types";
import { getNis2StatusLabel } from "@/lib/nis2/betroffenheit";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import { formatCurrency } from "@/lib/utils";
import { NIS2_COMPLIANCE_REFERENCE } from "@/lib/ai/document-templates";

type Section = { heading: string; body: string[] };

function companyName(c: Company) {
  return c.company_name ?? "das Unternehmen";
}

function industry(c: Company) {
  return c.industry ?? "nicht näher spezifizierte Branche";
}

function employees(c: Company) {
  return c.employee_count != null ? `${c.employee_count} Mitarbeitende` : "eine zu dokumentierende Mitarbeiterzahl";
}

function securityContact(c: Company) {
  if (c.security_contact_name) {
    return `${c.security_contact_name}${c.security_contact_email ? ` (${c.security_contact_email})` : ""}`;
  }
  return "der benannte Ansprechpartner für Informationssicherheit";
}

function itLandscape(c: Company): string[] {
  const lines: string[] = [];
  if (c.uses_microsoft_365) lines.push("Microsoft 365 wird als zentrale Kollaborations- und Kommunikationsplattform eingesetzt.");
  if (c.uses_cloud_services) lines.push("Cloud-Dienste unterstützen wesentliche Geschäftsprozesse und erfordern erhöhte Kontrollen.");
  if (c.has_it_service_provider) lines.push("Externe IT-Dienstleister sind in die Betriebsführung eingebunden und unterliegen vertraglichen Sicherheitsanforderungen.");
  if (c.publicly_accessible_systems) lines.push("Öffentlich erreichbare Systeme erfordern zusätzliche Schutzmaßnahmen gegen Angriffe aus dem Internet.");
  if (lines.length === 0) lines.push("Die IT-Landschaft ist anhand der Unternehmensgröße und Branche zu konkretisieren und regelmäßig zu aktualisieren.");
  return lines;
}

function assembleDocument(title: string, sections: Section[]): string {
  const parts = [`# ${title}`, ""];
  for (const s of sections) {
    parts.push(`## ${s.heading}`, "");
    for (const p of s.body) {
      parts.push(p, "");
    }
  }
  return parts.join("\n");
}

function baseSections(c: Company): Section[] {
  const name = companyName(c);
  return [
    {
      heading: "Zweck des Dokuments",
      body: [
        `Dieses Dokument legt verbindliche Anforderungen und Vorgehensweisen für ${name} fest. Es unterstützt die strukturierte Umsetzung der Anforderungen der NIS2-Richtlinie (EU 2022/2555) und dient als auditfähiger Nachweis für interne und externe Prüfungen.`,
        `Ziel ist es, Risiken für Netz- und Informationssysteme systematisch zu reduzieren, Verantwortlichkeiten klar zu regeln und die Widerstandsfähigkeit kritischer Geschäftsprozesse nachhaltig zu stärken. Das Dokument verbindet regulatorische Erwartungen mit konkret umsetzbaren Maßnahmen im Tagesgeschäft.`,
        `Als Teil des TKND NIS2 Control Center Compliance-Pakets wird dieses Dokument versioniert geführt und bei wesentlichen Änderungen der IT-Landschaft, Organisation oder Rechtslage überprüft.`,
      ],
    },
    {
      heading: "Geltungsbereich",
      body: [
        `Geltungsbereich umfasst ${name} mit Sitz in ${c.country ?? "Deutschland"}. Die Regelungen gelten für alle Mitarbeitenden, Führungskräfte, externen Dienstleister mit Systemzugang sowie alle IT-Systeme, Anwendungen, Datenbestände und Kommunikationswege, die Geschäftsprozesse unterstützen.`,
        c.eu_operations
          ? "Aufgrund EU-weiter Tätigkeit sind grenzüberschreitende Anforderungen, Meldepflichten und die Abstimmung mit nationalen Umsetzungsgesetzen besonders zu berücksichtigen."
          : "Die Umsetzung orientiert sich primär an den nationalen Anforderungen der NIS2-Umsetzung in Deutschland und den branchenspezifischen Erwartungen der zuständigen Behörden.",
        "Ausgenommen sind ausschließlich Systeme, die nachweislich keine geschäftskritischen oder personenbezogenen Daten verarbeiten und in einer separaten Ausnahmeliste dokumentiert sind.",
      ],
    },
    {
      heading: "Unternehmenskontext",
      body: [
        `${name} ist in der Branche ${industry(c)} tätig und beschäftigt ${employees(c)}.`,
        c.annual_revenue != null
          ? `Der Jahresumsatz beträgt ${formatCurrency(c.annual_revenue)} und fließt in die Einordnung nach Größenschwellenwerten der NIS2-Richtlinie ein.`
          : "Der Jahresumsatz ist für die Einordnung der Größenschwellenwerte zu dokumentieren und jährlich zu aktualisieren.",
        c.balance_sheet_total != null
          ? `Die Bilanzsumme liegt bei ${formatCurrency(c.balance_sheet_total)}.`
          : "Die Bilanzsumme ist für die regulatorische Einordnung relevant und sollte im Unternehmensprofil gepflegt werden.",
        c.critical_business_processes
          ? `Kritische Geschäftsprozesse: ${c.critical_business_processes}. Diese Prozesse haben prioritären Schutzbedarf und sind bei Risikoanalyse und Business Continuity besonders zu berücksichtigen.`
          : "Kritische Geschäftsprozesse sind vollständig zu identifizieren und in einer separaten Asset- und Prozessliste zu hinterlegen. Bis zur Vervollständigung gilt ein konservativer Schutzansatz.",
        ...itLandscape(c),
        `Der aktuelle Compliance-Score im TKND NIS2 Control Center beträgt ${c.compliance_score} Prozent und dient als Indikator für den Reifegrad der Umsetzung.`,
      ],
    },
    {
      heading: "Rechtlicher und organisatorischer Bezug zu NIS2",
      body: [
        NIS2_COMPLIANCE_REFERENCE,
        `Die NIS2-Richtlinie verpflichtet Unternehmen in definierten Sektoren und Größenklassen zur Umsetzung angemessener technischer und organisatorischer Maßnahmen (Art. 21). ${name} ordnet sich aktuell als „${getNis2StatusLabel(c.nis2_status)}“ ein.`,
        `Organisatorisch trägt die Geschäftsleitung die Gesamtverantwortung für Risikomanagement, Schulungen und Meldewesen. Operative Umsetzung und Koordination obliegen ${securityContact(c)}. Regelmäßige Berichte an die Leitung sind verpflichtend und werden mindestens quartalsweise erstellt.`,
        `Dieses Dokument ergänzt weitere Nachweise wie Risikoanalyse, Maßnahmenplan, Incident-Response-Prozess, Backup-Konzept, Zugriffskonzept und Lieferantenbewertung zu einem konsistenten, prüfbaren Compliance-Paket im Audit-Ordner.`,
        "Bei wesentlichen Sicherheitsvorfällen können Meldepflichten gegenüber zuständigen Behörden innerhalb von 24 bzw. 72 Stunden ausgelöst werden. Die internen Prozesse sind darauf ausgerichtet.",
      ],
    },
    {
      heading: "Rollen und Verantwortlichkeiten",
      body: [
        "Geschäftsleitung: Gesamtverantwortung, Ressourcenfreigabe, Genehmigung von Sicherheitsrichtlinien, Eskalationsentscheidungen und Nachweis der Aufsichtspflicht gegenüber Prüfern.",
        `${securityContact(c)}: Koordination der Informationssicherheit, Pflege der Dokumentation, Steuerung von Maßnahmen, Meldungen und Schnittstelle zu Behörden und Audoren.`,
        "IT-Verantwortliche: Technische Umsetzung, Patch-Management, Backup, Logging, Zugriffskontrollen, Schwachstellenmanagement und Wiederherstellung nach Vorfällen.",
        "Fachabteilungen: Einhaltung der Vorgaben in Geschäftsprozessen, Meldung von Auffälligkeiten, Mitwirkung an Schulungen und Bereitstellung prozessbezogener Informationen.",
        "Personal / HR: Onboarding und Offboarding mit zeitnaher Rechtevergabe bzw. -entziehung, Awareness-Schulungen und Vertraulichkeitsvereinbarungen.",
        "Alle Mitarbeitenden: Einhaltung der Sicherheitsregeln, sichere Nutzung von Systemen, Verwendung starker Authentifizierung und sofortige Meldung von Sicherheitsvorfällen.",
      ],
    },
    {
      heading: "Konkrete Anforderungen",
      body: [
        "Risikobasierter Ansatz: Maßnahmen werden nach Eintrittswahrscheinlichkeit und Schadensausmaß priorisiert und dokumentiert.",
        "Defense in Depth: Mehrschichtige Schutzmaßnahmen aus Technik, Organisation und Personal — kein alleiniger Vertrauensschutz in einzelne Kontrollen.",
        "Need-to-know und Least Privilege: Zugriffe werden auf das betriebsnotwendige Minimum beschränkt und regelmäßig rezertifiziert.",
        "Nachweispflicht: Alle wesentlichen Entscheidungen, Änderungen und Vorfälle werden revisionssicher protokolliert.",
        "Lieferkettensicherheit: Kritische Dienstleister werden vertraglich und operativ auf Sicherheitsanforderungen geprüft.",
      ],
    },
  ];
}

function typeSpecificSections(c: Company, type: DocumentType): Section[] {
  const name = companyName(c);

  const map: Record<DocumentType, Section[]> = {
    nis2_betroffenheitsanalyse: [
      {
        heading: "Prozessbeschreibung",
        body: [
          "Die Betroffenheitsanalyse erfolgt strukturiert auf Basis dokumentierter Unternehmensdaten: Branche, Mitarbeiterzahl, Umsatz, Bilanzsumme, EU-Tätigkeit, Cloud-Nutzung, kritische Prozesse und digitale Exposition.",
          "Es werden Sektorzuordnung (Anhang I und II der NIS2-Richtlinie), Größenschwellenwerte (Mitarbeiter, Umsatz, Bilanz) und die Kritikalität der erbrachten Dienste bewertet. Ergebnis und Begründung werden revisionssicher dokumentiert.",
          "Die Analyse wird bei Wachstum, Fusionen, neuen Geschäftsfeldern oder regulatorischen Änderungen wiederholt — mindestens jedoch jährlich.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          `Aktuelles Ergebnis der Einordnung: ${getNis2StatusLabel(c.nis2_status)}.`,
          `Branche ${industry(c)}, ${employees(c)}${c.annual_revenue != null ? `, Umsatz ${formatCurrency(c.annual_revenue)}` : ""}${c.balance_sheet_total != null ? `, Bilanzsumme ${formatCurrency(c.balance_sheet_total)}` : ""}.`,
          c.eu_operations
            ? "EU-weite Tätigkeit erhöht die Wahrscheinlichkeit grenzüberschreitender Melde- und Koordinationspflichten."
            : "Fokus auf nationale Umsetzung und zuständige Registrierungsstelle.",
          c.uses_cloud_services || c.uses_microsoft_365
            ? "Cloud- und SaaS-Nutzung erhöht die Angriffsfläche und erfordert erweiterte Kontrollen (MFA, Logging, CSPM)."
            : "On-Premises-IT erfordert eigenverantwortliches Patch- und Backup-Management.",
          "Bei wahrscheinlicher Betroffenheit: Registrierung prüfen, ISMS aufbauen, Meldeprozesse etablieren, Lieferkettenrisiken bewerten, Management-Reporting einführen.",
          "Bei nicht betroffener Einordnung: jährliche Neubewertung und Dokumentation des Prüfzeitpunkts.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          !c.employee_count ? "Mitarbeiterzahl im Unternehmensprofil vervollständigen." : "Mitarbeiterzahl dokumentiert.",
          !c.annual_revenue ? "Jahresumsatz erfassen für Schwellenwertprüfung." : "Jahresumsatz erfasst.",
          !c.balance_sheet_total ? "Bilanzsumme erfassen." : "Bilanzsumme erfasst.",
          !c.critical_business_processes ? "Kritische Prozesse detailliert beschreiben." : "Kritische Prozesse dokumentiert.",
          "Finale rechtliche Einordnung durch Fachanwalt oder Branchenverband empfohlen.",
        ],
      },
    ],
    informationssicherheitsleitlinie: [
      {
        heading: "Prozessbeschreibung",
        body: [
          `Die Informationssicherheitsleitlinie definiert für ${name} verbindliche Sicherheitsziele: Vertraulichkeit, Integrität und Verfügbarkeit von Informationen. Sie gilt unternehmensweit und wird jährlich von der Geschäftsleitung genehmigt.`,
          "Die Leitlinie bildet die Grundlage für untergeordnete Richtlinien zu Zugriff, Backup, Incident Response und Lieferantenmanagement. Alle Mitarbeitenden werden bei Eintritt und jährlich auf die Leitlinie verpflichtet.",
          "Sicherheitsvorfälle werden gemäß Incident-Response-Plan behandelt. Kontinuierliche Verbesserung erfolgt über KPIs (z. B. Patch-Quote, MFA-Abdeckung, Schulungsquote), interne Audits und Lessons Learned.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          "Zugriffsschutz nach Need-to-know-Prinzip mit dokumentierter Berechtigungsmatrix und halbjährlicher Rezertifizierung.",
          "MFA verpflichtend für privilegierte Konten, Remote-Zugänge und alle Cloud-Dienste.",
          "Regelmäßige Security-Awareness-Schulungen mit Nachweis für alle Mitarbeitenden — mindestens jährlich.",
          "Klare Verantwortung der Geschäftsleitung für Sicherheitskultur, Budget und personelle Ressourcen.",
          ...itLandscape(c),
          "Verschlüsselung sensibler Daten in Ruhe und bei Übertragung gemäß aktuellem Stand der Technik.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "Feinabstimmung mit bestehenden ISO 27001- oder BSI-Grundschutz-Prozessen, falls vorhanden.",
          "Quantitative Sicherheitsziele (KPIs) mit Schwellenwerten definieren.",
        ],
      },
    ],
    risikoanalyse: [
      {
        heading: "Prozessbeschreibung",
        body: [
          `Die Risikoanalyse für ${name} folgt einem strukturierten Vorgehen: Asset-Inventar, Bedrohungsanalyse, Schwachstellenbewertung, Risikobewertung, Maßnahmenableitung und Priorisierung.`,
          "Bewertungskriterien umfassen Eintrittswahrscheinlichkeit, Schadensausmaß und bestehende Kontrollen. Ergebnisse werden mindestens jährlich und nach wesentlichen Änderungen aktualisiert.",
          "Die Risikoanalyse ist Grundlage für den Maßnahmenplan und wird im Audit-Ordner revisionssicher abgelegt.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          "| Asset | Bedrohung | Schwachstelle | Risiko | Maßnahme |",
          "|---|---|---|---|---|",
          c.uses_microsoft_365
            ? "| Microsoft 365 | Phishing, Kontoübernahme | Fehlende MFA | Hoch | MFA, Conditional Access, Awareness |"
            : "| E-Mail/Kommunikation | Phishing | Schwache Passwörter | Mittel | MFA, Richtlinien |",
          c.uses_cloud_services
            ? "| Cloud-Infrastruktur | Fehlkonfiguration | Offene Ports | Hoch | Hardening, CSPM, Reviews |"
            : "| Server/On-Prem | Ransomware | Veraltete Systeme | Hoch | Patching, Backup, Segmentierung |",
          c.publicly_accessible_systems
            ? "| Webanwendungen | OWASP-Angriffe | Ungepatchte Apps | Hoch | WAF, Pentests, Monitoring |"
            : "| Interne Anwendungen | Insider | Überberechtigung | Mittel | IAM, Logging |",
          `| Kritische Prozesse | Ausfall | Single Points of Failure | ${c.critical_business_processes ? "Hoch" : "Mittel"} | BCM, Redundanz |`,
          "Restrisiken werden von der Geschäftsleitung dokumentiert akzeptiert oder mit zusätzlichen Maßnahmen behandelt.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "Quantitative Risikobewertung mit definierten Akzeptanzkriterien ergänzen.",
          "Vollständiges Asset-Inventar mit Verantwortlichen und Schutzbedarf vervollständigen.",
        ],
      },
    ],
    massnahmenplan: [
      {
        heading: "Prozessbeschreibung",
        body: [
          "Maßnahmen werden aus Risikoanalyse und Betroffenheitsprüfung abgeleitet, nach Kategorie klassifiziert und mit Verantwortlichkeiten, Zielzustand und Frist versehen.",
          "Der Maßnahmenstatus wird im TKND NIS2 Control Center gepflegt und quartalsweise an die Geschäftsleitung berichtet.",
          "Abhängigkeiten zwischen Maßnahmen werden dokumentiert, um Ressourcenengpässe frühzeitig zu erkennen.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          "| Priorität | Kategorie | Maßnahme | Verantwortlich | Zielzustand | Frist |",
          "|---|---|---|---|---|---|",
          "| Hoch | Organisatorisch | Incident-Response-Prozess etablieren | ISB | Dokumentierter IR-Plan | 0-3 Monate |",
          "| Hoch | Technisch | MFA für alle Cloud-Zugänge | IT | 100% MFA-Abdeckung | 0-3 Monate |",
          "| Mittel | Technisch | Backup-Tests dokumentieren | IT | Quartalsweise Tests | 3-6 Monate |",
          "| Mittel | Personell | Security Awareness Schulung | HR/ISB | Jährliche Pflichtschulung | 6 Monate |",
          c.has_it_service_provider
            ? "| Hoch | Lieferkette | IT-Dienstleister bewerten | Einkauf/ISB | Lieferantenbewertung abgeschlossen | 3 Monate |"
            : "| Niedrig | Lieferkette | Lieferanteninventar erstellen | Einkauf | Vollständige Liste | 12 Monate |",
          "Jede Maßnahme erhält einen messbaren Zielzustand und einen definierten Review-Termin.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "Maßnahmen im Maßnahmenmodul pflegen und Fortschritt mit Verantwortlichen abstimmen.",
          "Budgetfreigabe für hochpriorisierte technische Maßnahmen einholen.",
        ],
      },
    ],
    incident_response_plan: [
      {
        heading: "Prozessbeschreibung",
        body: [
          "Der Incident-Response-Prozess umfasst sieben Phasen: Erkennung, Meldung, erste Bewertung (innerhalb von 2 Stunden), Eindämmung, Analyse, Wiederherstellung und Nachbereitung.",
          "Bei erheblichen Vorfällen werden Meldepflichten (24h/72h) geprüft und die Geschäftsleitung unverzüglich informiert.",
          "Ein dediziertes Incident-Team mit klaren Rollen (Incident Commander, IT, ISB, Kommunikation) wird für kritische Fälle aktiviert.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          "Eskalationsmatrix mit Geschäftsleitung für kritische Vorfälle. Kommunikationsplan intern/extern mit Vorlagen für Statusmeldungen.",
          "Forensische Sicherung von Logs und Beweismitteln vor Bereinigung. Dokumentation aller Schritte für Audit und regulatorische Meldungen.",
          "Jährliche Tabletop-Übung mit Lessons Learned und Aktualisierung des Plans.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "Tabletop-Übung für Incident Response mindestens jährlich durchführen.",
          "24/7-Erreichbarkeit für kritische Meldungen sicherstellen.",
        ],
      },
    ],
    backup_konzept: [
      {
        heading: "Prozessbeschreibung",
        body: [
          "Die Backup-Strategie folgt wo möglich dem 3-2-1-Prinzip: drei Kopien, zwei Medien, eine Offsite-Kopie.",
          "Operative Backups und langfristige Archiv-Backups werden getrennt geführt. RPO und RTO werden je kritischem System definiert.",
          "Backup-Jobs werden automatisiert überwacht; Fehler lösen Alarme an die IT-Verantwortlichen aus.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          "Tägliche automatisierte Backups kritischer Systeme mit Verschlüsselung und Immutable-/Offline-Kopien gegen Ransomware.",
          "Quartalsweise Restore-Tests mit schriftlichem Protokoll und Bewertung der Wiederherstellungszeit.",
          "Verantwortlichkeit bei IT-Leitung; Review und Freigabe durch ISB nach jedem Test.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "RPO/RTO je kritischem Prozess quantifizieren und dokumentieren.",
          "Backup-Übersicht mit Aufbewahrungsfristen vervollständigen.",
        ],
      },
    ],
    zugriffskonzept: [
      {
        heading: "Prozessbeschreibung",
        body: [
          "Zugriffe werden rollenbasiert vergeben, regelmäßig rezertifiziert und bei Personalwechsel zeitnah angepasst.",
          "Privilegierte Konten sind von Standardkonten getrennt und unterliegen erhöhter Protokollierung.",
          "Onboarding und Offboarding sind mit HR und IT abgestimmte Standardprozesse mit definierten Fristen.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          "MFA verpflichtend für privilegierte, administrative und Cloud-Zugänge.",
          "Rezertifizierung aller Berechtigungen mindestens halbjährlich durch Fachverantwortliche und ISB.",
          c.uses_microsoft_365
            ? "Microsoft 365: Conditional Access, MFA, minimale Admin-Rollen, PIM wo verfügbar."
            : "Zentrale Verzeichnisdienste mit Passwortrichtlinie, Kontosperre und Protokollierung.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "Berechtigungsmatrix je System erstellen und regelmäßig prüfen.",
          "Break-Glass-Konten dokumentieren und überwachen.",
        ],
      },
    ],
    lieferantenbewertung: [
      {
        heading: "Prozessbeschreibung",
        body: [
          "IT-relevante Lieferanten werden nach Kritikalität, Datenzugriff und Prozessabhängigkeit klassifiziert.",
          "Sicherheitsanforderungen werden vertraglich fixiert; Nachweise (Zertifikate, Audits) werden vor Beauftragung geprüft.",
          "Kritische Lieferanten werden jährlich re-bewertet; Ausfall-Szenarien und Exit-Strategien sind dokumentiert.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          c.has_it_service_provider
            ? "Managed-Service-Provider: SLA, AV-Vertrag, Nachweis von Sicherheitszertifizierungen, Audit-Rechte und Meldepflichten vereinbaren."
            : "Lieferanteninventar aufbauen und Kritikalität nach Datenart und Verfügbarkeitsabhängigkeit bewerten.",
          "Sicherheitsfragebogen für neue IT-Lieferanten verpflichtend. Mindestanforderungen: Verschlüsselung, MFA, Incident-Meldung.",
          "Jährliche Re-Bewertung kritischer Lieferanten mit dokumentiertem Ergebnis.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "Vollständige Lieferantenliste mit Kritikalitätsstufen pflegen.",
          "Alternativanbieter für kritische Dienste identifizieren.",
        ],
      },
    ],
    meldeprozess: [
      {
        heading: "Prozessbeschreibung",
        body: [
          "Sicherheitsvorfälle werden unverzüglich an den ISB gemeldet. Dieser bewertet Erheblichkeit, Auswirkungen und Meldepflicht.",
          "Bei erheblichem Vorfall: Erstmeldung innerhalb von 24 Stunden, Detailmeldung innerhalb von 72 Stunden an die zuständige Behörde.",
          "Alle Meldungen werden mit Zeitstempel, betroffenen Systemen und Sofortmaßnahmen dokumentiert.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          "Meldeformular mit Pflichtfeldern: Entdecker, Zeitpunkt, betroffene Systeme, Datenarten, Einschätzung, Sofortmaßnahmen.",
          "Verantwortlichkeit: ISB koordiniert, Geschäftsleitung genehmigt externe Meldung und Behördenkommunikation.",
          "Regelmäßige Schulung der Meldepflicht für alle Mitarbeitenden mit klarer Kontaktliste.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "Zuständige Meldebehörde für den Unternehmenssitz verifizieren und Kontaktdaten hinterlegen.",
          "Entwurf für Erst- und Folgemeldung vorbereiten.",
        ],
      },
    ],
    management_zusammenfassung: [
      {
        heading: "Prozessbeschreibung",
        body: [
          `Diese Management-Zusammenfassung bündelt den NIS2-Compliance-Status für die Geschäftsleitung von ${name} auf Basis von Unternehmensprofil, Betroffenheitsprüfung, Risikoanalyse und Maßnahmenstand.`,
          "Sie dient als Entscheidungsgrundlage für Budget, Personal und Priorisierung von Sicherheitsinvestitionen.",
          "Die Zusammenfassung wird quartalsweise aktualisiert oder nach wesentlichen Vorfällen und regulatorischen Änderungen.",
        ],
      },
      {
        heading: "Konkrete Maßnahmen",
        body: [
          `Aktueller NIS2-Status: ${getNis2StatusLabel(c.nis2_status)}. Compliance-Score: ${c.compliance_score} Prozent.`,
          "Wesentliche Risiken: Phishing und Kontoübernahme, Ransomware, Lieferkettenausfälle, unzureichende Dokumentation und fehlende MFA.",
          "Empfehlung für die Geschäftsleitung: Unternehmensprofil pflegen, Betroffenheitscheck jährlich wiederholen, priorisierte Maßnahmen umsetzen, Meldeprozesse etablieren und ISB-Ressourcen sichern.",
          "Kurzfristig: MFA-Rollout, Incident-Response-Plan freigeben. Mittelfristig: Lieferantenbewertung, Backup-Tests. Langfristig: kontinuierliche Reifegradsteigerung.",
        ],
      },
      {
        heading: "Offene Punkte",
        body: [
          "Budget und Personalressourcen für ISB-Funktion langfristig sichern.",
          "Quartalsbericht an Geschäftsleitung als festen Kalendereintrag verankern.",
        ],
      },
    ],
  };

  return map[type] ?? [];
}

function closingSections(): Section[] {
  return [
    {
      heading: "Nachweise und Dokumentationspflichten",
      body: [
        "Dieses Dokument ist Teil des Audit-Ordners und wird zusammen mit Risikoanalyse, Maßnahmenplan, Incident-Response-Plan, Backup-Konzept und Lieferantenbewertung aufbewahrt.",
        "Änderungen werden versioniert und mit Datum, Verantwortlichem und Änderungsgrund dokumentiert. Frühere Versionen bleiben für Prüfzwecke mindestens drei Jahre archiviert.",
        "Nachweise umfassen u. a. Genehmigungsprotokolle, Schulungslisten, Testprotokolle, Incident-Logs, Backup-Restore-Berichte und Lieferantenbewertungen.",
      ],
    },
    {
      heading: "Überprüfung und Aktualisierung",
      body: [
        "Mindestens jährliche Überprüfung auf Aktualität und Wirksamkeit durch den Informationssicherheitsbeauftragten mit Bericht an die Geschäftsleitung.",
        "Außerordentliche Überprüfung bei wesentlichen Änderungen der IT-Landschaft, Organisation, regulatorischen Anforderungen oder nach schwerwiegenden Sicherheitsvorfällen.",
        "Ergebnisse der Überprüfung werden mit Maßnahmen, Verantwortlichen und Fristen im Maßnahmenplan nachverfolgt.",
      ],
    },
  ];
}

export function generateFallbackDocument(company: Company, documentType: string): string {
  const type = documentType as DocumentType;
  const title = getDocumentTypeLabel(type);
  const sections = [
    ...baseSections(company),
    ...typeSpecificSections(company, type),
    ...closingSections(),
  ];
  return assembleDocument(title, sections);
}
