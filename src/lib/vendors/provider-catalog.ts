import type {
  VendorCategory,
  VendorCriticality,
  VendorEvidenceType,
  VendorQuestionnaireAnswers,
  VendorRiskLevel,
} from "@/lib/vendors/types";

export const CUSTOM_PROVIDER_KEY = "custom" as const;

export interface ProviderEvidenceRecommendation {
  evidenceType: VendorEvidenceType;
  /** Anzeige-Label (z. B. „Microsoft Trust Center Nachweise“) */
  label: string;
}

export interface KnownProviderProfile {
  key: string;
  name: string;
  category: VendorCategory;
  website: string;
  defaultCriticality: VendorCriticality;
  /** Mindest-Risikostufe — auch große Anbieter nie automatisch risikofrei */
  riskFloor: VendorRiskLevel;
  riskAdvisory: string;
  recommendedEvidence: ProviderEvidenceRecommendation[];
  defaultQuestionnaire: Partial<VendorQuestionnaireAnswers>;
  searchTerms: string[];
}

const CLOUD_ADVISORY =
  "Externer Cloud-Dienst. Es besteht ein verbleibendes Lieferanten- und Verfügbarkeitsrisiko.";

const HOSTING_ADVISORY =
  "Externer Hosting-Dienst. Verfügbarkeit und Datenhoheit erfordern laufende Bewertung.";

export const KNOWN_PROVIDER_PROFILES: KnownProviderProfile[] = [
  {
    key: "microsoft_365",
    name: "Microsoft 365",
    category: "saas",
    website: "https://www.microsoft.com/microsoft-365",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory: CLOUD_ADVISORY,
    recommendedEvidence: [
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzvereinbarung" },
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "other", label: "Microsoft Trust Center Nachweise" },
      { evidenceType: "selbstauskunft", label: "Sicherheitsinformationen" },
    ],
    defaultQuestionnaire: {
      processes_personal_data: "yes",
      info_security_policy: "yes",
    },
    searchTerms: ["m365", "office 365", "o365", "microsoft office"],
  },
  {
    key: "microsoft_azure",
    name: "Microsoft Azure",
    category: "cloud",
    website: "https://azure.microsoft.com",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory: CLOUD_ADVISORY,
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzvereinbarung" },
      { evidenceType: "iso_27001", label: "ISO 27001 / SOC-Berichte" },
      { evidenceType: "other", label: "Microsoft Trust Center Nachweise" },
      { evidenceType: "sla", label: "SLA / Verfügbarkeitsvereinbarung" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes", notfallkonzept: "yes" },
    searchTerms: ["azure", "ms azure"],
  },
  {
    key: "aws",
    name: "AWS",
    category: "cloud",
    website: "https://aws.amazon.com",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory: CLOUD_ADVISORY,
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzvereinbarung" },
      { evidenceType: "iso_27001", label: "ISO 27001 / SOC-Berichte" },
      { evidenceType: "other", label: "AWS Artifact / Compliance-Nachweise" },
      { evidenceType: "sla", label: "SLA" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes", notfallkonzept: "yes" },
    searchTerms: ["amazon web services", "amazon cloud"],
  },
  {
    key: "google_cloud",
    name: "Google Cloud",
    category: "cloud",
    website: "https://cloud.google.com",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory: CLOUD_ADVISORY,
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzvereinbarung" },
      { evidenceType: "iso_27001", label: "ISO 27001 / SOC-Berichte" },
      { evidenceType: "other", label: "Google Cloud Compliance-Nachweise" },
      { evidenceType: "toms", label: "TOMs" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes" },
    searchTerms: ["gcp", "google workspace"],
  },
  {
    key: "ionos",
    name: "IONOS",
    category: "hosting",
    website: "https://www.ionos.de",
    defaultCriticality: "medium",
    riskFloor: "medium",
    riskAdvisory: HOSTING_ADVISORY,
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzinformationen" },
      { evidenceType: "toms", label: "TOMs" },
      { evidenceType: "iso_27001", label: "ISO-Zertifizierungen" },
      { evidenceType: "sla", label: "Leistungsbeschreibung / SLA" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes" },
    searchTerms: ["1&1", "1und1"],
  },
  {
    key: "strato",
    name: "STRATO",
    category: "hosting",
    website: "https://www.strato.de",
    defaultCriticality: "medium",
    riskFloor: "medium",
    riskAdvisory: HOSTING_ADVISORY,
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzinformationen" },
      { evidenceType: "toms", label: "TOMs" },
      { evidenceType: "selbstauskunft", label: "Sicherheitsinformationen" },
      { evidenceType: "sla", label: "Leistungsbeschreibung" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes" },
    searchTerms: [],
  },
  {
    key: "hetzner",
    name: "Hetzner",
    category: "rechenzentrum",
    website: "https://www.hetzner.com",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory:
      "Externer Rechenzentrums-/Hosting-Dienst. Abhängigkeit und Verfügbarkeit erfordern Bewertung.",
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzinformationen" },
      { evidenceType: "iso_27001", label: "ISO-Zertifizierungen" },
      { evidenceType: "toms", label: "TOMs" },
      { evidenceType: "notfallkonzept", label: "Notfallkonzept / BCM" },
    ],
    defaultQuestionnaire: { notfallkonzept: "unknown" },
    searchTerms: ["hetzner cloud", "hcloud"],
  },
  {
    key: "sap",
    name: "SAP",
    category: "softwareanbieter",
    website: "https://www.sap.com",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory:
      "Kritischer Software-/SaaS-Anbieter. Geschäftsprozessabhängigkeit und Datenverarbeitung bewerten.",
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzvereinbarung" },
      { evidenceType: "iso_27001", label: "ISO 27001 / Zertifizierungen" },
      { evidenceType: "toms", label: "TOMs" },
      { evidenceType: "selbstauskunft", label: "Sicherheitsfragebogen / Selbstauskunft" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes", iso_27001: "yes" },
    searchTerms: ["sap se", "s/4hana"],
  },
  {
    key: "ovh",
    name: "OVH",
    category: "hosting",
    website: "https://www.ovhcloud.com",
    defaultCriticality: "medium",
    riskFloor: "medium",
    riskAdvisory: HOSTING_ADVISORY,
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzinformationen" },
      { evidenceType: "iso_27001", label: "ISO-Zertifizierungen" },
      { evidenceType: "toms", label: "TOMs" },
      { evidenceType: "sla", label: "SLA" },
    ],
    defaultQuestionnaire: {},
    searchTerms: ["ovhcloud"],
  },
  {
    key: "telekom",
    name: "Telekom",
    category: "telekommunikation",
    website: "https://www.telekom.de",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory:
      "Telekommunikationsdienst mit hoher Betriebsrelevanz. Verfügbarkeit und Abhängigkeit beachten.",
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzvereinbarung" },
      { evidenceType: "sla", label: "SLA / Leistungsbeschreibung" },
      { evidenceType: "toms", label: "TOMs" },
      { evidenceType: "selbstauskunft", label: "Sicherheitsinformationen" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes" },
    searchTerms: ["deutsche telekom", "t-systems", "t-systems"],
  },
  {
    key: "vodafone",
    name: "Vodafone",
    category: "telekommunikation",
    website: "https://www.vodafone.de",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory:
      "Telekommunikationsdienst mit hoher Betriebsrelevanz. Verfügbarkeit und Abhängigkeit beachten.",
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzvereinbarung" },
      { evidenceType: "sla", label: "SLA / Leistungsbeschreibung" },
      { evidenceType: "toms", label: "TOMs" },
      { evidenceType: "selbstauskunft", label: "Sicherheitsinformationen" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes" },
    searchTerms: ["vodafone business"],
  },
  {
    key: "datev",
    name: "DATEV",
    category: "softwareanbieter",
    website: "https://www.datev.de",
    defaultCriticality: "high",
    riskFloor: "medium",
    riskAdvisory:
      "Kritischer Fachsoftware-Anbieter. Verarbeitung personenbezogener und geschäftskritischer Daten.",
    recommendedEvidence: [
      { evidenceType: "av_vertrag", label: "AV-Vertrag" },
      { evidenceType: "datenschutzvereinbarung", label: "Datenschutzvereinbarung" },
      { evidenceType: "toms", label: "TOMs" },
      { evidenceType: "iso_27001", label: "ISO-Zertifizierungen" },
      { evidenceType: "selbstauskunft", label: "Sicherheitsinformationen / DATEV-Cloud-Nachweise" },
    ],
    defaultQuestionnaire: { processes_personal_data: "yes", info_security_policy: "yes" },
    searchTerms: ["datev cloud"],
  },
];

export function getKnownProvider(key: string | null | undefined): KnownProviderProfile | null {
  if (!key || key === CUSTOM_PROVIDER_KEY) return null;
  return KNOWN_PROVIDER_PROFILES.find((p) => p.key === key) ?? null;
}

export function searchKnownProviders(query: string): KnownProviderProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return KNOWN_PROVIDER_PROFILES;
  return KNOWN_PROVIDER_PROFILES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.key.includes(q) ||
      p.searchTerms.some((t) => t.includes(q))
  );
}

export function matchKnownProviderByName(name: string): KnownProviderProfile | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  return (
    KNOWN_PROVIDER_PROFILES.find(
      (p) =>
        p.name.toLowerCase() === normalized ||
        p.searchTerms.some((t) => t === normalized)
    ) ?? null
  );
}

export function getRecommendedEvidenceTypes(
  providerKey: string | null | undefined
): VendorEvidenceType[] {
  const profile = getKnownProvider(providerKey);
  if (!profile) return [];
  return [...new Set(profile.recommendedEvidence.map((r) => r.evidenceType))];
}

export function getProviderRiskFloor(
  providerKey: string | null | undefined
): VendorRiskLevel | null {
  return getKnownProvider(providerKey)?.riskFloor ?? null;
}

export function getProviderRiskAdvisory(providerKey: string | null | undefined): string | null {
  return getKnownProvider(providerKey)?.riskAdvisory ?? null;
}

export function getProviderDefaults(providerKey: string | null | undefined): {
  name: string;
  category: VendorCategory;
  website: string;
  criticality: VendorCriticality;
  questionnaire: Partial<VendorQuestionnaireAnswers>;
  recommendedEvidence: ProviderEvidenceRecommendation[];
  riskAdvisory: string | null;
} | null {
  const profile = getKnownProvider(providerKey);
  if (!profile) return null;
  return {
    name: profile.name,
    category: profile.category,
    website: profile.website,
    criticality: profile.defaultCriticality,
    questionnaire: profile.defaultQuestionnaire,
    recommendedEvidence: profile.recommendedEvidence,
    riskAdvisory: profile.riskAdvisory,
  };
}

export function getEvidenceLabelForProvider(
  providerKey: string | null | undefined,
  evidenceType: VendorEvidenceType
): string | null {
  const profile = getKnownProvider(providerKey);
  if (!profile) return null;
  const match = profile.recommendedEvidence.find((r) => r.evidenceType === evidenceType);
  return match?.label ?? null;
}
