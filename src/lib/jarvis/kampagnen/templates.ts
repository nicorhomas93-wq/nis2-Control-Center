export interface CampaignTemplate {
  key: string;
  name: string;
  target_group: string;
  description: string;
  goal: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "it_dienstleister_de",
    name: "IT-Dienstleister Deutschland",
    target_group: "IT-Dienstleister",
    description: "Systemhäuser und IT-Dienstleister mit KMU-Mandanten",
    goal: "White-Label- und Reseller-Partner für NIS2-Dokumentation gewinnen",
  },
  {
    key: "systemhaeuser_de",
    name: "Systemhäuser Deutschland",
    target_group: "Systemhäuser",
    description: "Regionale Systemhäuser mit Managed Services",
    goal: "Partner gewinnen — NIS2 als Ergänzung zum Portfolio",
  },
  {
    key: "msp_de",
    name: "MSP Deutschland",
    target_group: "Managed Service Provider",
    description: "MSP mit Security- und Compliance-Anfragen von Kunden",
    goal: "White-Label Interessenten für NIS2 Control Center",
  },
  {
    key: "m365_partner",
    name: "Microsoft 365 Spezialisten",
    target_group: "Cloud / Microsoft Partner",
    description: "M365-Partner und Cloud-Dienstleister",
    goal: "NIS2-Ergänzung zum Microsoft-Portfolio anbieten",
  },
  {
    key: "cybersecurity_de",
    name: "Cybersecurity Anbieter",
    target_group: "IT-Sicherheit",
    description: "Security-Dienstleister und Berater",
    goal: "NIS2-Erweiterung für bestehende Kundenmandate",
  },
  {
    key: "datenschutz_berater",
    name: "Datenschutzberater",
    target_group: "Datenschutz",
    description: "Externe Datenschutzbeauftragte und Berater",
    goal: "Dokumentationsplattform als Ergänzung anbieten",
  },
  {
    key: "iso_nis2_berater",
    name: "Informationssicherheitsberater",
    target_group: "ISO / NIS2",
    description: "ISO 27001 und NIS2-Berater",
    goal: "Audit-Plattform für Mandanten bereitstellen",
  },
  {
    key: "dach_partner",
    name: "DACH Partnerprogramm",
    target_group: "Partner und Reseller",
    description: "Channel-Partner im DACH-Raum",
    goal: "Reseller und White-Label-Partner aufbauen",
  },
];

export const CAMPAIGN_IDEAS = [
  {
    name: "Systemhäuser Sachsen",
    target_group: "Systemhäuser",
    goal: "Partner gewinnen",
  },
  {
    name: "MSP Deutschland",
    target_group: "Managed Service Provider",
    goal: "White-Label Interessenten",
  },
  {
    name: "Microsoft 365 Partner",
    target_group: "Cloud / Microsoft Partner",
    goal: "NIS2 Ergänzung anbieten",
  },
  {
    name: "Datenschutzberater",
    target_group: "Datenschutz",
    goal: "Dokumentationsplattform anbieten",
  },
  {
    name: "ISO 27001 Berater",
    target_group: "ISO / NIS2",
    goal: "Audit-Plattform anbieten",
  },
  {
    name: "Cybersecurity Dienstleister",
    target_group: "IT-Sicherheit",
    goal: "NIS2 Erweiterung für Kunden",
  },
  {
    name: "Cloud & Hosting Anbieter",
    target_group: "Cloud / Hosting",
    goal: "NIS2 Dokumentation und Auditmanagement",
  },
];

export function getCampaignTemplate(key: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.key === key);
}
