import { AUDIT_FOLDERS } from "@/lib/audit/audit-folders";
import { generateFallbackDocument } from "@/lib/ai/document-fallback";
import { finalizeDocumentContent } from "@/lib/documents/generation-mode";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import type { Company, Document, Measure, Nis2Assessment, Risk } from "@/lib/types";

export const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000002";

const now = () => new Date().toISOString();

export const DEMO_COMPANY: Company = {
  id: DEMO_COMPANY_ID,
  user_id: DEMO_USER_ID,
  company_name: "MusterTech GmbH",
  industry: "ICT-Dienstleistungen",
  employee_count: 85,
  annual_revenue: 12_500_000,
  balance_sheet_total: 6_000_000,
  country: "Deutschland",
  eu_operations: true,
  uses_microsoft_365: true,
  uses_cloud_services: true,
  critical_business_processes:
    "Betrieb von Kundenplattformen, IT-Support, Datenverarbeitung",
  has_it_service_provider: true,
  publicly_accessible_systems: true,
  security_contact_name: "Demo ISB",
  security_contact_email: "demo-isb@mustertech.example",
  nis2_status: "wahrscheinlich_wichtige_einrichtung",
  compliance_score: 92,
  created_at: now(),
  updated_at: now(),
};

function buildDemoDocuments(): Document[] {
  const timestamp = now();
  return AUDIT_FOLDERS.map((folder) => {
    const raw = generateFallbackDocument(DEMO_COMPANY, folder.documentType);
    const content = finalizeDocumentContent(raw, "demo");
    return {
      id: `demo-doc-${folder.documentType}`,
      company_id: DEMO_COMPANY_ID,
      title: getDocumentTypeLabel(folder.documentType),
      document_type: folder.documentType,
      content,
      status: "published" as const,
      version: 1,
      generation_mode: "demo" as const,
      created_at: timestamp,
      updated_at: timestamp,
    };
  });
}

export const DEMO_DOCUMENTS: Document[] = buildDemoDocuments();

export const DEMO_ASSESSMENT: Nis2Assessment = {
  id: "demo-assessment-1",
  company_id: DEMO_COMPANY_ID,
  result: "wahrscheinlich_wichtige_einrichtung",
  reasoning:
    "MusterTech GmbH ist als ICT-Dienstleister mit 85 Mitarbeitenden, EU-weiter Tätigkeit und kritischen Kundenplattformen voraussichtlich als wichtige Einrichtung einzuordnen.",
  score: 78,
  created_at: now(),
};

export const DEMO_MEASURES: Measure[] = [
  {
    id: "demo-measure-1",
    company_id: DEMO_COMPANY_ID,
    title: "Incident-Response-Plan veröffentlichen",
    description: "Freigabe durch Geschäftsleitung",
    status: "completed",
    priority: "high",
    responsible: "Demo ISB",
    target_state: "Veröffentlicht",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "demo-measure-2",
    company_id: DEMO_COMPANY_ID,
    title: "MFA für alle Admin-Konten",
    description: "Microsoft 365 und Cloud-Administration",
    status: "in_progress",
    priority: "high",
    responsible: "IT-Leitung",
    target_state: "100 % MFA",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "demo-measure-3",
    company_id: DEMO_COMPANY_ID,
    title: "Lieferanten-SLA prüfen",
    description: "AV-Verträge und Meldepflichten",
    status: "open",
    priority: "medium",
    responsible: "Einkauf",
    target_state: null,
    created_at: now(),
    updated_at: now(),
  },
];

export const DEMO_RISKS: Risk[] = [
  {
    id: "demo-risk-1",
    company_id: DEMO_COMPANY_ID,
    asset: "Kundenplattform",
    threat: "Ransomware / Ausfall",
    risk_level: "high",
    measure: "Backup, Monitoring, IR-Plan",
    analysis_content: null,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "demo-risk-2",
    company_id: DEMO_COMPANY_ID,
    asset: "Microsoft 365",
    threat: "Kompromittierung von Admin-Konten",
    risk_level: "medium",
    measure: "MFA, PIM, Least Privilege",
    analysis_content: null,
    created_at: now(),
    updated_at: now(),
  },
];

export const DEMO_LAST_AUDIT_EXPORT = now();
