import type { B2BOutreachLead } from "@/lib/types";
import {
  OUTREACH_PRIORITY_LABELS,
  PARTNER_POTENTIAL_LABELS,
} from "@/lib/jarvis/outreach/constants";
import { filterLeadFinderLeads } from "@/lib/jarvis/outreach/lead-finder-stats";

const EXPORT_HEADERS = [
  "Firmenname",
  "Website",
  "E-Mail",
  "Telefon",
  "Kontaktformular",
  "LinkedIn",
  "Standort",
  "Branche",
  "Mitarbeiter",
  "Lead Score",
  "Potenzial",
  "Priorität",
  "Partner-Score",
  "Status",
  "Quelle",
  "Erstellt",
] as const;

function escapeCsv(value: string | null | undefined): string {
  const s = value ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function escapeXml(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function location(lead: B2BOutreachLead): string {
  return [lead.city, lead.region].filter(Boolean).join(", ");
}

function exportRow(lead: B2BOutreachLead & { resolved_quality_score?: number }): string[] {
  const score =
    lead.resolved_quality_score ??
    lead.lead_quality_score ??
    (lead.partner_score != null ? String(lead.partner_score) : "");

  return [
    lead.company_name,
    lead.website ?? lead.detected_website_url ?? "",
    lead.contact_email ?? "",
    lead.contact_phone ?? "",
    lead.has_contact_form ? "Ja" : "Nein",
    lead.linkedin_url ?? "",
    location(lead),
    lead.industry ?? "",
    lead.employee_count ?? "",
    String(score),
    lead.partner_potential
      ? (PARTNER_POTENTIAL_LABELS[lead.partner_potential] ?? lead.partner_potential)
      : "",
    lead.outreach_priority
      ? (OUTREACH_PRIORITY_LABELS[lead.outreach_priority] ?? lead.outreach_priority)
      : "",
    lead.partner_score != null ? String(lead.partner_score) : "",
    lead.status,
    lead.source,
    lead.created_at,
  ];
}

export function leadsToFinderCsv(leads: B2BOutreachLead[]): string {
  const qualified = filterLeadFinderLeads(leads);
  const rows = qualified.map((lead) =>
    exportRow(lead).map(escapeCsv).join(",")
  );
  return [EXPORT_HEADERS.join(","), ...rows].join("\n");
}

export function leadsToFinderExcel(leads: B2BOutreachLead[]): string {
  const qualified = filterLeadFinderLeads(leads);
  const headerCells = EXPORT_HEADERS.map(
    (h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
  ).join("");

  const dataRows = qualified
    .map((lead) => {
      const cells = exportRow(lead)
        .map((v) => `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`)
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Lead Finder">
<Table>
<Row>${headerCells}</Row>
${dataRows}
</Table>
</Worksheet>
</Workbook>`;
}
